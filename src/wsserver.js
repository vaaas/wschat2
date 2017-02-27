"use strict"

const uws = require("uws")

function is_rpc (obj) {
	return (
		obj.fn !== undefined &&
		typeof(obj.fn) === "string" &&
		obj.args !== undefined &&
		obj.args instanceof Array &&
		obj.id !== undefined &&
		Number.isInteger(obj.id)) }

const channels = { "general": true }
const names = {}
const rpcmap = {
	chat: chat,
	name: name,
	join: join,
	part: part,
	priv: priv,
}

class Message {
	static note(text) {
		return JSON.stringify({
			fn: "note",
			args: [text]
		})
	}
	static priv(username, text) {
		return JSON.stringify({
			fn: "priv",
			args: [username, text]
		})
	}
	static join(channel, username) {
		return JSON.stringify({
			fn: "join",
			args: [channel, username]
		})
	}
	static part(channel, username) {
		return JSON.stringify({
			fn: "part",
			args: [channel, username]
		})
	}
	static chat(channel, username, text) {
		return JSON.stringify({
			fn: "chat",
			args: [channel, username, text]
		})
	}
	static ret(id, ok, value) {
		return JSON.stringify({
			fn: "ret",
			args: [id, ok, value]
		})
	}
}

function chat (socket, id, channel, msg) {
	if (!(socket.username && channel in socket.channels))
		socket.send(Message.ret(id, false, "No username or channel"))
	else {
		broadcast(channel, Message.chat(channel, socket.username, msg))
		socket.send(Message.ret(id, true, true))
	}
}

function name (socket, id, name) {
	if (name in names)
		return socket.send(Message.ret(id, false, "Name already taken"))
	else if (socket.username)
		delete names[socket.username]
	names[name] = true
	socket.username = name
	socket.send(Message.ret(id, true, true))
}

function join (socket, id, channel) {
	if (!socket.username)
		socket.send(Message.ret(id, false, "No username set"))
	else if (channel in socket.channels)
		socket.send(Message.ret(id, false, "Already in channel " + channel))
	else if (!(channel in channels))
		socket.send(Message.ret(id, false, "Channel doesn't exist"))
	else {
		socket.channels[channel] = true
		broadcast(channel, Message.join(channel, socket.username))
		socket.send(Message.ret(id, true, backlog()))
	}
}

function part (socket, id, channel) {
	if (!socket.username)
		socket.send(Message.ret(id, false, "No username set"))
	else if (!channel in socket.channels)
		socket.send(Message.ret(id, false, "Not in channel"))
	else {
		delete socket.channels[channel]
		broadcast(channel, Message.part(channel, socket.username))
		socket.send(Message.ret(id, true, true))
	}
}

function priv (socket, id, user, msg) {
	if (!socket.username)
		socket.send(Message.ret(id, false, "No username set"))
	else if (!names[user])
		socket.send(Message.ret(id, false, "No such user"))
	else {
		names[user].send(Message.priv(socket.username, msg))
		socket.send(Message.ret(id, true, true))
	}
}

function backlog() {
	return ["nothing yo"]
}

module.exports = class WSServer {
	constructor (port, hostname, remote, exposed, valid) {
		this.remote = remote_factory(remote)
		this.returns = {}
		this.exposed = exposed
		this.valid = valid
		this.server = new uws.Server({
			port: port, host: hostname })
		this.server.on("connection", s => { this.on_connection(s) })}
	
	remote_factory (names) {
		const obj = {}
		for (let i = 0, n = names[i]; i < names.length; i++) {
			obj[n] = (socket, cb, ...args) => {
				const id = this.sensible_id()
				socket.send(JSON.stringify({
					fn: n,
					args: args,
					id: id })
				if (cb.constructor === Function)
					this.returns[id] = cb }}}

	on_connection (socket) {
		socket.on("message", m => { this.on_message(socket, m) })
		socket.on("close", (c, m) => { this.on_close(socket, c, m) })
		socket.on("error", (e) => { this.on_error(socket, e) }) }

	on_message (socket, message) {
		console.log(message)
		var obj
		try { 
			obj = JSON.parse(message) }
		catch (e) {
			return socket.close("Please don't send invalid JSON") }
		if (!is_rpc(obj))
			socket.close("Please don't send invalid RPCs")
		else if (!(obj.fn in this.exposed))
			socket.close("Method doesn't exist")
		else if (!valid[obj.fn](obj.args))
			socket.close("Invalid arguments")
		else
			rpcmap[obj.fn](this, obj.id, ...obj.args) }

	on_close (socket, code, message) {
		for (let channel in socket.channels)
			broadcast(channel, Message.part(channel, socket.username))
		delete names[socket.username]
	}

	on_error (socket, error) {
		for (let channel in socket.channels)
			broadcast(channel, Message.part(channel, socket.username))
		socket.close()
		delete names[socket.username]
		console.error(error)
	}

	broadcast (channel, what) {
		server.clients.forEach(client => {
			client.send(what)
		})
	}
}
