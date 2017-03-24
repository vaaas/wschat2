// jshint asi: true
// jshint browser: true
function main() {
"use strict"
var CONNECTSTRING = "ws://localhost:50000"

function empty_object_p(obj) {
	return (typeof(obj) === "object" && Object.keys(obj).length === 0)
}

var Templates = function(){
	var elems = {
		message: document.getElementById("message"),
		info: document.getElementById("info"),
		tab: document.getElementById("tab"),
		chatview: document.getElementById("chatview"),
		namedialog: document.getElementById("namedialog"),
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
	function namedialog() {
		return document.importNode(elems.namedialog.content, true)
	}
	return {
		message: message,
		info: info,
		tab: tab,
		chatview: chatview,
		namedialog: namedialog,
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

var Tabbar = function () {
	var tabbarelem = document.getElementById("tabbar")
	var chatareaelem = document.getElementById("chatarea")
	var tabs = []
	var hash = {}
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
	function hide_tab (id) {
		tabs[id].tab.className = "tab"
		tabs[id].view.style.display = "none"
		tabs[id].text = TextArea.get_text()
		TextArea.deregister()
	}
	function show_tab (id) {
		if (tabs[id].text) TextArea.set_text(tabs[id].text)
		TextArea.register(tabs[id].name)
		tabs[id].tab.className = "tab active"
		tabs[id].view.style.display = "block"
	}
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
		tabs.push({
			tab: document.getElementById("tab_" + name),
			view: document.getElementById("view_" + name),
			name: name,
		})
		hash[name] = tabs.length - 1
		if (current_tab !== null) hide_tab(current_tab)
		current_tab = hash[name]
		show_tab(current_tab)
	}
	function close_tab (name) {
		var id = hash[name]
		tabs[id].tab.remove()
		tabs[id].view.remove()
		tabs.splice(id, 1)
		delete hash[name]
	}
	function add_message (channel, name, text) {
		var msg = Templates.message(name, text)
		add_elem(channel, msg)
	}
	function add_join (channel, name) {
		var msg = Templates.info(name + " has joined " + channel)
		add_elem(channel, msg)
	}
	function add_part (channel, name) {
		var msg = Templates.info(name + " has left " + channel)
		add_elem(channel, msg)
	}
	function add_elem (channel, elem) {
		var e = tabs[hash[channel]].view
		e.appendChild(elem)
		if (e.children.length > 200)
			for (var i = 0; i < 100; i++)
				e.children[i].remove()
		e.children[e.children.length-1].scrollIntoView()
	}

	return {
		add_tab: add_tab,
		close_tab: close_tab,
		add_message: add_message,
		add_join: add_join,
		add_elem: add_elem,
	}
}()

var TextArea = function () {
	var channel = ""
	var elem = document.getElementById("textarea")
	elem.onkeypress = keypress
	function register (chn) {
		channel = chn
	}
	function deregister () { channel = "" }
	function fire () {
		if (channel) WSInterface.chat(channel, elem.value)
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
	function enable () { elem.disabled = false }
	function disable () { elem.disabled = true }
	return {
		register: register,
		deregister: deregister,
		fire: fire,
		get_text: get_text,
		set_text: set_text,
		enable: enable,
		disable: disable,
	}
}()

var dialog = {
	name: function (cb) {
		var elem = Templates.namedialog()
		document.body.appendChild(elem)
		elem = document.querySelector("form")
		setTimeout(function () { elem.style.opacity = "1" }, 10)
		elem.onsubmit = function () {
			var text = elem.querySelector("input:first-child").value.trim()
			if (text === "" || /\s/.test(text)) return false
			else {
				elem.remove()
				cb(text)
				return true
			}
		}
	},
}

var WSInterface = function () {
	var state = {
		name: undefined,
		channels: []
	}
	var ws = new WebSocket(CONNECTSTRING)
	ws.onmessage = ws_distribute
	ws.onopen = onopen

	function onopen (e) { handshake[0]() }
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
	function join (channel, cb) {
		rpc("join", [channel], function (ok, value) {
			if (ok) {
				state.channels.push(channel)
				Tabbar.add_tab(channel)
				ChannelSubject.subscribe(channel, channel_observer(channel))
			}
			if (cb) cb(ok, value)
		})
	}
	function part (channel, cb) {
		rpc("part", [channel], function (ok, value) {
			if (ok) {
				state.channels.slice(state.channels.indexOf(channel), 1)
				Tabbar.close_tab(channel)
				ChannelSubject.unsubscribe(channel)
			}
			if (cb) cb(ok, value)
		})
	}
	function chat (channel, msg, cb) { rpc("chat", [channel, msg], cb) }
	function name (name, cb) {
		rpc("name", [name], function (ok, value) {
			if (ok) state.name = name
			if (cb) cb(ok, value)
		})
	}

	function quit (e) {
		ws.close()
		return true
	}

	function channel_observer (channel) {
		return function (type, args) {
			switch(type) {
				case "chat":
					Tabbar.add_message(channel, args[0], args[1])
					break
				case "join":
					Tabbar.add_join(channel, args[0])
					break
				case "part":
					Tabbar.add_part(channel, args[0])
					break
				default:
					console.error("No case for this channel message type:", type)
					break
			}
		}
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
	return {
		priv: priv,
		join: join,
		part: part,
		chat: chat,
		name: name,
		quit: quit,
	}
}()

var handshake = [
	function(e) { dialog.name(handshake[1]) },
	function(name) { WSInterface.name(name, handshake[2]) },
	function(e) { WSInterface.join("general", handshake[3]) },
	function(e) { TextArea.enable() }, ]

window.onunload = WSInterface.quit

}

window.onload = main
