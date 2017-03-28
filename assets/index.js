"use strict"
// jshint browser: true

function $(q) { return document.querySelector(q) }
function $$(q) { return document.querySelectorAll(q) }

var app = {
	CONNECTSTRING: "ws://localhost:8001",

	ws: null,

	nick: null,

	waiting: {},

	channels: {},
	users: {},

	last_id: 0,
	sensible_id: function () { return app.last_id++ },

	copy_keys: function (o1, o2) {
		var keys = Object.keys(o1)
		for (var i = 0, key = keys[i]; i < keys.length; i++)
			o2[key] = o1[key] },

	main: function () {
		app.ws = app.initialise_ws()
		app.ui.elems = app.ui.elems() },

	initialise_ws: function () {
		var ws = new WebSocket(app.CONNECTSTRING)
		ws.onmessage = app.on_message
		ws.onopen = app.on_open
		ws.onclose = app.on_close
		ws.onerror = app.on_error
		return ws },

	on_message: function (e) {
		console.log(e.data)
		var o = JSON.parse(e.data)
		app.exposed[o.fn].apply(app, o.args) },

	on_open: function (e) { app.handshake[0]() },

	on_close: function (e) {},

	on_error: function (e) {},

	exposed: {
		ret: function (id, error, value) {
			if (app.waiting[id]) {
				app.waiting[id](error, value)
				delete app.waiting[id] }},

		groupchat: function (channel, sender, text) {
			if (channel in app.channels)
				app.channels[channel].view.appendChild(app.ui.message(sender,text))},

		chat: function (sender, text) {},

		nick: function (thenick) { app.nick = thenick },},

	remote: {
		groupchat: function (channel, message, cb) {
			if (message.length < 1) return
			app.ws.send(app.message("groupchat", [channel, message], cb)) },

		join: function (channel, cb) {
			app.ws.send(app.message("join", [channel], cb)) },

		part: function (channel, cb) {
			app.ws.send(app.message("part", [channel], cb)) },

		chat: function () {},

		nick: function () {},},

	message: function (fn, args, cb) {
		var id = app.sensible_id()
		if (cb) app.waiting[id] = cb
		return JSON.stringify({ fn: fn, args: args, id: id }) },

	handshake: [
		function () { app.remote.join("general", app.handshake[1]) },
		function (err, val) {
			if (err) return console.error(err)
			var tab = app.ui.add_tab("general")
			app.channels["general"] = tab
			app.ui.switch_tab(tab)
			app.ui.elems.textarea.disabled = false },],}

app.ui = {
	current_tab: null,

	elems: function () {
		var obj = {
			tabbar: $("#tabbar"),
			chatarea: $("#chatarea"),
			textarea: $("#textarea"), }
		obj.textarea.onkeypress = app.ui.on_key_press
		return obj },
	
	E: function (name, attrs, text, children) {
		var e = document.createElement(name)
		if (attrs) app.copy_keys(attrs, e)
		if (text) e.appendChild(document.createTextNode(text))
		if (children) children.forEach(c => { e.appendChild(c) })
		return e },


	message: function (sender, content) { 
		return app.ui.E("p", null, null, [
			app.ui.E("span", {className: "sender"}, sender),
			app.ui.E("span", {className: "content"}, content) ])},

	on_key_press: function (e) {
		if(e.keyCode === 13) {
			app.remote.groupchat("general", app.ui.elems.textarea.value)
			app.ui.elems.textarea.value = ""
			return false }
		else return true },

	add_tab: function (name) {
		var tab = app.ui.create_tab(name)
		tab.view = app.ui.create_view()
		app.ui.elems.tabbar.appendChild(tab)
		app.ui.elems.chatarea.appendChild(tab.view)
		return tab },

	close_tab: function (tab) {
		tab.parentNode.removeChild(tab)
		tab.view.parentNode.removeChild(tab.view) },

	next_tab: function () {
		app.ui.switch_tab(app.ui.current_tab.nextSibling) },

	previous_tab: function () {
		app.ui.switch_tab(app.ui.current_tab.previousSibling) },

	create_tab: function (name) {
		return app.ui.E("span", {}, name) },

	create_view: function () {
		return app.ui.E("div", {className: "view"}) },

	activate_tab: function (tab) {
		tab.className = "active"
		tab.view.display = "none" },

	deactivate_tab: function (tab) {
		tab.className = ""
		tab.view.display = "block" },

	switch_tab: function (tab) {
		app.ui.activate_tab(tab)
		if(app.ui.current_tab) app.ui.deactivate_tab(app.ui.current_tab)
		app.ui.current_tab = tab },}

window.onload = app.main
