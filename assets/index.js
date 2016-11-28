"use strict"

var CONNECTSTRING = "ws://localhost:50000"

function empty_object_p(obj) {
	return (typeof(obj) === "object" && Object.keys(obj).length === 0)
}

var Message = {
	name: function name(name) {
		return JSON.stringify({
			fn: "name",
			args: [name]
		})
	},
	join: function join(channel) {
		return JSON.stringify({
			fn: "join",
			args: [channel]
		})
	},
	part: function part(channel) {
		return JSON.stringify({
			fn: "part",
			args: [channel]
		})
	},
	chat: function chat(channel, msg) {
		return JSON.stringify({
			fn: "chat",
			args: [channel, msg]
		})
	},
	priv: function priv(user, msg) {
		return JSON.stringify({
			fn: "priv",
			args: [user, msg]
		})
	}
}

function WSInterface(connectstring) {
	this.ws = new WebSocket(connectstring)
	this.ws.onopen = this.on_open.bind(this)
	this.ws.onmessage = this.on_message.bind(this)
	this.cbs = {}
	this.lastid = null
}
WSInterface.prototype = {
	on_open: function on_open (event) {
		this.ws.send(Message.name("some name idk"))
		this.ws.send(Message.join("general"))
	},
	on_message: function on_message (event) {
		var obj = JSON.parse(event.data)
		this[obj.fn](obj.args)
	},
	rpc: function rpc (fn, args, cb) {
		var id
		if (empty_object_p(this.cbs)) {
			id = 0
			this.lastid = 0
		} else {
			id = ++this.lastid
		}
		this.ws.send(JSON.stringify({
			fn: fn,
			args: args,
			id: id
		}))
		if (cb !== undefined) this.cbs[id] = cb
	},
	ret: function ret (args) {
		var id = args[0]
		var ok = args[1]
		var value = args[2]
		this.cbs[id](ok, value)
		delete this.cbs[id]
	},
}

function TabBar () {}
TabBar.prototype = {}

function ChatTab () {}
ChatTab.prototype = {}

function TextArea () {}
TextArea.prototype = {}

function main() {
	var wsint = new WSInteraface(CONNECSTRING)
}

window.onload = main
