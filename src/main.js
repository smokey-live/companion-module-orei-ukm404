const { InstanceBase, InstanceStatus, Regex, runEntrypoint } = require('@companion-module/base')
const { MatrixClient } = require('./protocol')
const choices = (label) => Array.from({ length: 4 }, (_, i) => ({ id: i + 1, label: `${label} ${i + 1}` }))
const dropdown = (id, label) => ({ type: 'dropdown', id, label, default: 1, choices: choices(label) })
class UKM404 extends InstanceBase {
	async init(config) {
		this.define()
		await this.configUpdated(config)
	}
	async destroy() {
		this.client?.stop()
		this.client = undefined
	}
	getConfigFields() {
		return [
			{ type: 'textinput', id: 'host', label: 'Target IP address', width: 8, regex: Regex.IP },
			{ type: 'number', id: 'port', label: 'Telnet port', width: 4, default: 23, min: 1, max: 65535 },
			{
				type: 'number',
				id: 'interval',
				label: 'Refresh interval (seconds)',
				width: 6,
				default: 2,
				min: 0.5,
				max: 3600,
			},
		]
	}
	async configUpdated(config) {
		await this.destroy()
		this.config = config
		this.routes = {}
		this.connected = false
		this.setVariableValues({ connected: 'No' })
		this.checkFeedbacks('connected')
		this.publish()
		const port = Number(config.port ?? 23),
			interval = Number(config.interval ?? 2)
		if (
			!config.host ||
			!Number.isInteger(port) ||
			port < 1 ||
			port > 65535 ||
			!Number.isFinite(interval) ||
			interval < 0.5 ||
			interval > 3600
		) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter an IP, port and refresh interval (0.5–3600 seconds)')
			return
		}
		const client = (this.client = new MatrixClient({ host: config.host, port, interval }))
		client.on('unknown', () => {
			if (this.client !== client) return
			this.routes = {}
			this.publish()
		})
		client.on('connection', (ok) => {
			if (this.client !== client) return
			this.connected = ok
			this.setVariableValues({ connected: ok ? 'Yes' : 'No' })
			this.checkFeedbacks('connected')
			this.updateStatus(
				ok ? InstanceStatus.Ok : InstanceStatus.Connecting,
				ok ? undefined : 'Waiting for matrix routing status',
			)
		})
		client.on('route', ({ device, host }) => {
			if (this.client !== client) return
			this.routes[device] = host
			this.publish()
		})
		client.on('error', (e) => {
			if (this.client !== client) return
			this.log('warn', e.message)
			this.updateStatus(InstanceStatus.ConnectionFailure, e.message)
		})
		client.start()
	}
	publish() {
		const values = {}
		for (let d = 1; d <= 4; d++) values[`device_${d}_host`] = this.routes[d] ?? 'Unknown'
		this.setVariableValues(values)
		this.checkFeedbacks('route')
	}
	define() {
		this.routes = {}
		this.connected = false
		this.setVariableDefinitions([
			{ variableId: 'connected', name: 'Matrix connected' },
			...Array.from({ length: 4 }, (_, i) => ({
				variableId: `device_${i + 1}_host`,
				name: `Device ${i + 1} selected host (1–4 or Unknown)`,
			})),
		])
		this.setActionDefinitions({
			route: {
				name: 'Route device to host',
				options: [dropdown('device', 'Device'), dropdown('host', 'Host')],
				callback: async (e) => {
					if (!this.client?.route(Number(e.options.device), Number(e.options.host)))
						this.log('warn', 'Matrix is disconnected')
				},
			},
			route_all: {
				name: 'Route all devices to host',
				options: [dropdown('host', 'Host')],
				callback: async (e) => {
					for (let d = 1; d <= 4; d++)
						if (!this.client?.route(d, Number(e.options.host))) {
							this.log('warn', 'Matrix is disconnected')
							break
						}
				},
			},
			refresh: { name: 'Refresh routing status', options: [], callback: async () => this.client?.poll() },
		})
		this.setFeedbackDefinitions({
			route: {
				type: 'boolean',
				name: 'Device is routed to host',
				defaultStyle: { bgcolor: 0x008800, color: 0xffffff },
				options: [dropdown('device', 'Device'), dropdown('host', 'Host')],
				callback: (e) => this.routes[Number(e.options.device)] === Number(e.options.host),
			},
			connected: {
				type: 'boolean',
				name: 'Matrix is connected',
				defaultStyle: { bgcolor: 0x008800, color: 0xffffff },
				options: [],
				callback: () => this.connected,
			},
		})
		const presets = {}
		for (let d = 1; d <= 4; d++)
			for (let h = 1; h <= 4; h++)
				presets[`d${d}h${h}`] = {
					type: 'button',
					category: `Device ${d}`,
					name: `Device ${d} to Host ${h}`,
					style: { text: `Device ${d}\nHost ${h}`, size: 'auto', color: 0xffffff, bgcolor: 0x222222 },
					steps: [{ down: [{ actionId: 'route', options: { device: d, host: h } }], up: [] }],
					feedbacks: [
						{ feedbackId: 'route', options: { device: d, host: h }, style: { bgcolor: 0x008800, color: 0xffffff } },
					],
				}
		this.setPresetDefinitions(presets)
	}
}
runEntrypoint(UKM404, [])
