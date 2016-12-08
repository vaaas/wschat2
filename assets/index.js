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
			return console.log("JSON parsing error:", err.message)
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
		if (args[0] in this.channels)
			this.channels[channel](type, args.slice(1))
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
	chat: function chat (channel, msg, cb) { this.rpc("chat", [channel, msg], cb) },
	name: function name (name, cb) { this.rpc("name", [name], cb) },
}

function TabBar (chanpub, textarea) {
	this.chanpub = chanpub
	this.textarea = textarea

	this.tabbarelem = document.getElementById("tabbar")
	this.chatareaelem = document.getElementById("chatarea")
	this.tabs = []
	this.currenttab = null
}
TabBar.prototype = {
	next: function next() {
		this.hidetab(this.currenttab)
		this.cycletab(true)
		this.showtab(this.curernttab)
	},
	prev: function prev() {
		this.hidetab(this.currenttab)
		this.cycletab(false)
		this.showtab(this.curernttab)
	},
	hidetab: function hidetab (id) { this.tabs[id].hide() },
	showtab: function showtab (id) { this.tabs[id].show() },
	cycletab: function cycletab (clockwise) {
		if (clockwise) {
			if (this.currenttab + 1 < this.tabs.length) this.currenttab++
			else this.currenttab = 0
		} else {
			if (this.currenttab - 1 > 0) this.currenttab--
			else this.currentab = this.tabs.length - 1
		}
	},
	addtab: function addtab (name) {
		var tab = new ChatTab(name, textarea)
		this.tabs.push(tab)
		this.chatareaelem.appendChild(tab.viewelem)
		this.tabbarelem.appendChild(tab.tabelem)
	},
	closetab: function closetab () {
		this.tabs[this.currenttab].close()
		this.tabs.splice(this.currenttab, 1)
		if (this.currenttab >= this.tabs.length) this.currenttab = 0
		this.showtab(this.currenttab)
	}
}

function ChatTab (name, textarea) {
	this.name = name
	this.textarea = textarea

	var tpl = document.getElementById("tab")
	var spanelem = tpl.content.querySelector(".tab")
	spanelem.textContent = name
	var clone = document.importNode(tpl.content, true)
	this.tabelem = clone

	var tpl = document.getElementById("chaview")
	var sectionelem = tpl.content.querySelector(".chatview")
	var clone = document.importNode(tpl.content, true)
	this.viewelem = clone

	this.text = ""
}
ChatTab.prototype = {
	hide: function hide() {
		this.text = this.textarea.elem.value
		this.textarea.deregister()
		this.tabelem.className = ""
		this.viewelem.style.display = "none"
	},
	show: function show() {
		if (this.text) this.textarea.elem.value = this.text
		this.textarea.register(this)
		this.tabelem.className = "active"
		this.viewelem.style.display = "initial"
	},
	close: function close() {
		this.tabelem.remove()
		this.viewelem.remove()
	},
	add_message: function add_message (name, text) {
		// TODO
	},
	add_join: function add_join (name) {
		// TODO
	},
	add_part: function add_part (name) {
		// TODO
	},
	channel_subscriber: function channel_subscriber (type, args) {
		switch(type) {
			case "chat":
				add_message(args[0], args[1])
				break
			case "join":
				add_join(args[0])
				break
			case "part":
				add_part(args[0])
				break
			default:
				console.log("No case for this channel message type:", type)
				break
		}
	},
	submit: function submit (text) {
		// RPC shit
	},
}

function TextArea () {
	this.tab = null
	this.elem = document.getElementById("textarea")
	this.elem.onkeypress = this.keypress.bind(this)
}
TextArea.prototype = {
	register: function register (tab) { this.tab = tab },
	deregister: function deregister () { this.tab = null },
	keypress: function keypress (e) {
		if (e.keycode === 13) {
			this.tab.submit(this.elem.value)
			this.elem.value = ""
			return false
		} else { return true }
	},
}

function main() {
	// TODO
}

window.onload = main
