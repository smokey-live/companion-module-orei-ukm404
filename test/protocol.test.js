const { test } = require('node:test')
const assert = require('node:assert/strict')
const net = require('node:net')
const { TelnetDecoder, parseRoute, MatrixClient } = require('../src/protocol')
test('Telnet negotiation and routing lines survive every packet boundary', () => {
	const b = Buffer.concat([
		Buffer.from([255, 251, 3, 255, 250, 1, 2, 255, 240]),
		Buffer.from('device 1 in host 4\r\nDevice2    Host3\r\n'),
	])
	for (let cut = 0; cut <= b.length; cut++) {
		const lines = [],
			replies = []
		const d = new TelnetDecoder(
			(x) => replies.push([...x]),
			(x) => lines.push(x),
		)
		d.push(b.subarray(0, cut))
		d.push(b.subarray(cut))
		assert.deepEqual(lines, ['device 1 in host 4', 'Device2    Host3'])
		assert.deepEqual(replies, [[255, 254, 3]])
	}
})
test('Parser rejects command echoes and invalid ports', () => {
	assert.equal(parseRoute('set device 1 in host 4'), null)
	assert.equal(parseRoute('get device 1 in host'), null)
	assert.equal(parseRoute('device 5 in host 1'), null)
	assert.deepEqual(parseRoute('Device4    Host2'), { device: 4, host: 2 })
})
test('Routes become known only from device responses; reconnect clears state', async () => {
	const routes = [1, 1, 1, 1]
	const sockets = new Set()
	const server = net.createServer((s) => {
		sockets.add(s)
		s.on('close', () => sockets.delete(s))
		s.write(Buffer.from([255, 251, 3]))
		let text = ''
		s.on('data', (b) => {
			text += b.toString()
			let i
			while ((i = text.indexOf('\n')) >= 0) {
				let c = text.slice(0, i)
				text = text.slice(i + 1)
				let m = c.match(/set device ([1-4]) in host ([1-4])/)
				if (m) {
					routes[+m[1] - 1] = +m[2]
					s.write(`set device ${m[1]} in host ${m[2]}\r\n`)
				}
				m = c.match(/get device ([1-4]) in host/)
				if (m) s.write(`device ${m[1]} in host ${routes[+m[1] - 1]}\r\n`)
			}
		})
	})
	await new Promise((r) => server.listen(0, '127.0.0.1', r))
	const client = new MatrixClient({ host: '127.0.0.1', port: server.address().port, interval: 0.5 })
	client.on('error', () => {})
	try {
		client.start()
		await new Promise((r, j) => {
			const t = setTimeout(() => j(Error('timeout')), 3000)
			client.on('connection', (ok) => {
				if (ok) {
					clearTimeout(t)
					r()
				}
			})
		})
		assert.equal(client.routes[1], 1)
		const changed = new Promise((r) =>
			client.on('route', (v) => {
				if (v.device === 1 && v.host === 4) r()
			}),
		)
		client.route(1, 4)
		await changed
		assert.equal(client.routes[1], 4)
		assert.throws(() => client.route(0, 1))
		client.socket.destroy()
		await new Promise((r) => client.once('unknown', r))
		assert.deepEqual(client.routes, {})
	} finally {
		client.stop()
		for (const s of sockets) s.destroy()
		await new Promise((r) => server.close(r))
	}
})
