// jshint asi: true
// jshint browser: true
function main() {
"use strict"
var CONNECTSTRING = "ws://localhost:50000"

function empty_object_p(obj) {
	return (typeof(obj) === "object" && Object.keys(obj).length === 0)
}

function ws_distribute (event) {
	var obj
	try {
		obj = JSON.parse(event.data)
	} catch (err) {
		return console.error("JSON parsing error:", err.message)
	}
	console.log(event.data)
	switch(obj.fn) {
		case "ret":
			ReturnSubject.fire(obj.args[0], obj.args[1], obj.args[2])
			break
		case "priv":
			PrivSubject.fire(obj.args[0], obj.args[1])
			break
		case "chat":
			ChannelSubject.fire("chat", obj.args)
			break
		case "join":
			ChannelSubject.fire("join", obj.args)
			break
		case "part":
			ChannelSubject.fire("part", obj.args)
			break
	}
}

var Templates = function(){
	var elems = {
		message: document.getElementById("message"),
		info: document.getElementById("info"),
		tab: document.getElementById("tab"),
		chatview: document.getElementById("chatview"),
	}
	function message (name, text) {
		var p = elems.message.content.children[0]
		p.children[1].textContent = name
		p.children[2].textContent = text
		return document.importNode(elems.message.content, true)
	}
	function info (text) {
		elems.info.content.children[0].textContent = text
		return document.importNode(elems.info.content, true)
	}
	function tab (name) {
		elems.tab.content.children[0].textContent = name
		elems.tab.content.children[0].id = "tab_" + name
		return document.importNode(elems.tab.content, true)
	}
	function chatview(name) {
		elems.chatview.content.children[0].id = "view_" + name
		return document.importNode(elems.chatview.content, true)
	}
	return {
		message: message,
		info: info,
		tab: tab,
		chatview: chatview,
	}
}()

var ReturnSubject = function () {
	var ids = {}
	var lastid = null
	function sensible_id() {
		if (empty_object_p(ids)) {
			lastid = 0
			return 0
		} else return ++lastid
	}
	function fire (id, ok, value) {
		if (ids[id] === undefined) return
		ids[id](ok, value)
		unsubscribe(id)
	}
	function subscribe (id, cb) { ids[id] = cb }
	function unsubscribe (id) { delete ids[id] }
	return {
		sensible_id: sensible_id,
		fire: fire,
		subscribe: subscribe,
		unsubscribe: unsubscribe
	}
}()

var ChannelSubject = function () {
	var channels = {}
	function subscribe (channel, cb) { channels[channel] = cb }
	function unsubscribe (channel) { delete channels[channel] }
	function fire (type, args) {
		if (args[0] in channels)
			channels[args[0]](type, args.slice(1))
	}
	return {
		subscribe: subscribe,
		unsubscribe: unsubscribe,
		fire: fire
	}
}()

var PrivSubject = function() {
	var people = {}
	function subscribe (person, cb) { people[person] = cb }
	function unsubscribe (person) { delete people[person] }
	function fire (person, msg) {
		if (person in people) people[person](msg)
		else if (null in people) people[null](msg)
	}
}

var RPC = function () {
	function rpc (fn, args, cb) {
		var id = ReturnSubject.sensible_id()
		ws.send(JSON.stringify({
			fn: fn,
			args: args,
			id: id
		}))
		if (cb !== undefined) ReturnSubject.subscribe(id, cb)
	}
	function priv (user, msg, cb) { rpc("priv", [user, msg], cb) }
	function join (channel, cb) { rpc("join", [channel], cb) }
	function part (channel, cb) { rpc("part", [channel], cb) }
	function chat (channel, msg, cb) { rpc("chat", [channel, msg], cb) }
	function name (name, cb) { rpc("name", [name], cb) }
	return {
		priv: priv,
		join: join,
		part: part,
		chat: chat,
		name: name
	}
}()

var Tabbar = function () {
	var tabbarelem = document.getElementById("tabbar")
	var chatareaelem = document.getElementById("chatarea")
	var tabs = []
	var current_tab = null

	function next() {
		hide_tab(current_tab)
		cycle_tab(true)
		show_tab(current_tab)
	}
	function prev() {
		hide_tab(current_tab)
		cycle_tab(false)
		show_tab(current_tab)
	}
	function hide_tab (id) { tabs[id].hide() }
	function show_tab (id) { tabs[id].show() }
	function cycle_tab (clockwise) {
		if (clockwise) {
			if (current_tab + 1 < tabs.length) current_tab++
			else current_tab = 0
		} else {
			if (current_tab - 1 > 0) current_tab--
			else current_tab = tabs.length - 1
		}
	}
	function add_tab (name) {
		chatareaelem.appendChild(Templates.chatview(name))
		tabbarelem.appendChild(Templates.tab(name))
		var tab = new ChatTab(name)
		tabs.push(tab)
		if (current_tab !== null) hide_tab(current_tab)
		current_tab = tabs.length - 1
		show_tab(current_tab)
	}
	function close_tab () {
		tabs[current_tab].close()
		tabs.splice(current_tab, 1)
		if (current_tab >= tabs.length) current_tab = 0
		show_tab(current_tab)
	}

	return {
		add_tab: add_tab,
	}
}()

function ChatTab (name) {
	this.name = name
	this.tabelem = document.getElementById("tab_" + name)
	this.viewelem = document.getElementById("view_" + name)
	this.text = ""
	ChannelSubject.subscribe(this.name, this.observer.bind(this))
}
ChatTab.prototype = {
	hide: function hide() {
		this.text = TextArea.get_text()
		TextArea.deregister()
		this.tabelem.className = ""
		this.viewelem.style.display = "none"
	},
	show: function show() {
		if (this.text) TextArea.set_text(this.text)
		TextArea.register(this.submit.bind(this))
		this.tabelem.className = "active"
		this.viewelem.style.display = "block"
	},
	close: function close() {
		this.tabelem.remove()
		this.viewelem.remove()
	},
	add_message: function add_message (name, text) {
		var msg = Templates.message(name, text)
		this.add_elem(msg)
	},
	add_join: function add_join (name) {
		var msg = Templates.info(name + " has joined " + this.name)
		this.add_elem(msg)
	},
	add_part: function add_part (name) {
		var msg = Templates.info(name + " has left " + this.name)
		this.add_elem(msg)
	},
	add_elem: function (elem) {
		this.viewelem.appendChild(elem)
		if (this.viewelem.children.length > 200)
			for (var i = 0; i < 100; i++)
				this.viewelem.children[i].remove()
		this.viewelem.children[this.viewelem.children.length-1].scrollIntoView()
	},
	observer: function observer (type, args) {
		switch(type) {
			case "chat":
				this.add_message(args[0], args[1])
				break
			case "join":
				this.add_join(args[0])
				break
			case "part":
				this.add_part(args[0])
				break
			default:
				console.error("No case for this channel message type:", type)
				break
		}
	},
	submit: function submit (text) {
		RPC.chat(this.name, text)
	},
}

var TextArea = function () {
	var cb = null
	var elem = document.getElementById("textarea")
	elem.onkeypress = keypress
	function register (callback) { cb = callback }
	function deregister () { cb = null }
	function fire () {
		if (cb !== null) cb(elem.value)
		elem.value = ""
	}
	function keypress (e) {
		if (e.keyCode === 13) {
			fire()
			return false
		} else { return true }
	}
	function get_text () { return elem.value }
	function set_text (text) { elem.value = text }
	return {
		register: register,
		deregister: deregister,
		fire: fire,
		get_text: get_text,
		set_text: set_text
	}
}()

function quit (e) {
	for (var i = 0; i < state.channels.length; i++)
		RPC.part(state.channels[i])
}

var state = {
	name: undefined,
	channels: [],
}

var handshake = [
	function(e) {
		state.name = "dudeguy"
		RPC.name(state.name, handshake[1])
	},
	function(e) {
		state.channels.push("general")
		RPC.join("general", handshake[2])
	},
	function(e) { Tabbar.add_tab("general") }
]

var ws = new WebSocket(CONNECTSTRING)
ws.onmessage = ws_distribute
ws.onopen = handshake[0]

window.onunload = quit

}

window.onload = main
