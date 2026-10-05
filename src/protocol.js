const { EventEmitter } = require('node:events')
const net = require('node:net')

// Streaming Telnet decoder: negotiation and lines may span TCP packets.
class TelnetDecoder {
	constructor(reply, line) {
		this.reply = reply
		this.line = line
		this.state = 'data'
		this.text = ''
	}
	push(data) {
		for (const b of data) {
			if (this.state === 'iac') {
				if (b === 255) {
					this.state = 'data'
					continue
				}
				if (b === 251 || b === 252 || b === 253 || b === 254) {
					this.command = b
					this.state = 'option'
				} else this.state = b === 250 ? 'sub' : 'data'
				continue
			}
			if (this.state === 'option') {
				if (this.command === 251) this.reply(Buffer.from([255, 254, b]))
				if (this.command === 253) this.reply(Buffer.from([255, 252, b]))
				this.state = 'data'
				continue
			}
			if (this.state === 'sub') {
				if (b === 255) this.state = 'subiac'
				continue
			}
			if (this.state === 'subiac') {
				this.state = b === 240 ? 'data' : 'sub'
				continue
			}
			if (b === 255) {
				this.state = 'iac'
				continue
			}
			if (b === 10) {
				this.line(this.text)
				this.text = ''
			} else if (b !== 13 && b !== 0) {
				this.text += String.fromCharCode(b)
				if (this.text.length > 8192) this.text = ''
			}
		}
	}
}
function parseRoute(line) {
	// Ignore command echoes: only authoritative readbacks and status table rows.
	const m = line
		.trim()
		.match(/^device\s*([1-4])\s*(?:in\s+host\s*|->\s*host\s*|connect\s+to\s+host\s*|host\s*)([1-4])$/i)
	return m ? { device: Number(m[1]), host: Number(m[2]) } : null
}
class MatrixClient extends EventEmitter {
	constructor({ host, port = 23, interval = 2 }) {
		super()
		this.host = host
		this.port = port
		this.interval = interval
		this.stopped = true
		this.routes = {}
	}
	start() {
		this.stopped = false
		this.connect()
	}
	connect() {
		if (this.stopped) return
		this.emit('connection', false)
		this.routes = {}
		this.emit('unknown')
		const socket = (this.socket = net.createConnection({ host: this.host, port: this.port }))
		const decoder = new TelnetDecoder(
			(b) => socket.write(b),
			(line) => {
				const route = parseRoute(line)
				if (route) {
					this.routes[route.device] = route.host
					this.lastResponse = Date.now()
					this.emit('route', route)
					if (Object.keys(this.routes).length === 4) this.emit('connection', true)
				}
			},
		)
		socket.setTimeout(10000)
		socket.on('connect', () => {
			socket.setTimeout(0)
			this.lastResponse = Date.now()
			this.poll()
			this.timer = setInterval(() => {
				if (Date.now() - this.lastResponse > Math.max(10000, this.interval * 3000)) {
					this.emit('error', new Error('No routing response from matrix'))
					socket.destroy()
				} else this.poll()
			}, this.interval * 1000)
		})
		socket.on('data', (b) => decoder.push(b))
		socket.on('timeout', () => socket.destroy())
		socket.on('error', (e) => this.emit('error', e))
		socket.on('close', () => {
			clearInterval(this.timer)
			this.routes = {}
			this.emit('unknown')
			this.emit('connection', false)
			if (!this.stopped) this.retry = setTimeout(() => this.connect(), 3000)
		})
	}
	send(command) {
		if (!this.socket || this.socket.destroyed || this.socket.readyState !== 'open') return false
		this.socket.write(command + '\r\n')
		return true
	}
	poll() {
		for (let d = 1; d <= 4; d++) this.send(`get device ${d} in host`)
	}
	route(device, host) {
		if (!Number.isInteger(device) || device < 1 || device > 4 || !Number.isInteger(host) || host < 1 || host > 4)
			throw new Error('Device and host must be 1–4')
		if (!this.send(`set device ${device} in host ${host}`)) return false
		this.send(`get device ${device} in host`)
		return true
	}
	stop() {
		this.stopped = true
		clearTimeout(this.retry)
		clearInterval(this.timer)
		this.socket?.destroy()
	}
}
module.exports = { TelnetDecoder, parseRoute, MatrixClient }
