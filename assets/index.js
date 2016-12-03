"use strict"

var CONNECTSTRING = "ws://localhost:50000"

function empty_object_p(obj) {
	return (typeof(obj) === "object" && Object.keys(obj).length === 0)
}

function WSDistributor () {
	this.returnpub = new ReturnPublisher()
	this.chanpub = new ChannelPublisher()
	this.privpub = new PrivPublisher()
}
WSDistributor.prototype = {
	distribute: function distribute (event) {
		var obj
		try {
			obj = JSON.parse(event.data)
		} catch (err) {
			return "TODO: publish error"
		}
		switch(obj.fn) {
			case "ret":
				this.returnpub.publish(obj.args[0], obj.args[1], obj.args[2])
				break
			case "priv":
				this.privpub.publish(obj.args[0], obj.args[1])
				break
			case "chat":
				this.chanpub.publish("chat", obj.args)
				break
			case "join":
				this.chanpub.publish("join", obj.args)
				break
			case "part":
				this.chanpub.publish("part", obj.args)
				break
		}
	},
}

function ReturnPublisher () {
	this.ids = {}
	this.lastid = null
}

function ChannelPublisher () {
	this.channels = {}
}
ChannelPublisher.prototype = {
	subscribe: function (channel, cb) { this.channels[channel] = cb }
	unsubscribe: function (channel) { delete this.channels[channel] }
	publish: function (type, args) {
		if (channel in this.channels) this.channels[channel](type, args)
	}
}

function PrivPublisher () {
	this.people = {}
}
PrivPublisher.prototype = {
	subscribe: function (person, cb) { this.people[person] = cb }
	unsubscribe: function (person) { delete this.people[person] }
	publish: function (person, msg) {
		if (person in this.people) this.people[person](msg)
		else if (null in this.people) this.people[null](msg)
	}
}

ReturnPublisher.prototype = {
	sensible_id: function sensible_id () {
		if (empty_object_p(this.cbs)) {
			this.lastid = 0
			return 0
		} else return ++this.lastid
	},
	subscribe: function subscribe (id, cb) { this.cbs[id] = cb },
	unsubscribe: function unsubscribe (id) { delete this.cbs[id] },
	publish: function publish(id, ok, value) {
		this.cbs[id](ok, value)
		this.unsubscribe(id)
	},
}

function RPCaller (sendfn, publisher) {
	this.send = sendfn
	this.publisher = publisher
}
RPCaller.prototype = {
	rpc: function rpc (fn, args, cb) {
		var id = this.publisher.sensible_id()
		this.send(JSON.stringify({
			fn: fn,
			args: args,
			id: id
		}))
		if (cb !== undefined) this.publisher.subscribe(id, cb)
	},
	priv: function name (user, msg, cb) { this.rpc("name", [user, msg], cb) },
	join: function join (channel, cb) { this.rpc("join", [channel], cb) },
	part: function part (channel, cb) { this.rpc("part", [channel], cb) },
	chat: function chat (channel, msg, cb) { this.rpc("chat", [channel, msg], cb)},
	name: function name (name, cb) { this.rpc("name", [name], cb) },
}

function TabBar () {}
TabBar.prototype = {}

function ChatTab () {}
ChatTab.prototype = {}

function TextArea () {}
TextArea.prototype = {}

function main() {
	// TODO
}

window.onload = main
