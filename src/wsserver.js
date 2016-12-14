"use strict"

const uws = require("uws")
const valid = require("./valid.js")

module.exports = function WSServer (port, hostname) {
	const channels = { "general": true }
	const names = {}
	const rpcmap = {
		chat: chat,
		name: name,
		join: join,
		part: part,
		priv: priv,
	}
	const server = new uws.Server({
		port: port, host: hostname
	})
	server.on("connection", on_connection)

	function on_connection (socket) {
		socket.on("message", on_message)
		socket.on("close", on_close)
		socket.on("error", on_error)
		socket.username = null
		socket.channels = {}
	}

	function on_message (message) {
		console.log(message)
		var obj
		try { 
			obj = JSON.parse(message)
		} catch (e) {
			return this.close("Please don't send invalid JSON")
		}
		if (!valid.RPC(obj))
			this.close("Please don't send invalid RPCs")
		else if (!(obj.fn in rpcmap))
			this.close("Method doesn't exist")
		else if (!valid[obj.fn](obj.args))
			this.close("Invalid arguments")
		else
			rpcmap[obj.fn](this, obj.id, ...obj.args)
	}

	function on_close (code, message) {
		for (let channel in this.channels)
			broadcast(channel, Message.part(channel, this.username))
		delete names[this.username]
	}

	function on_error (error) {
		for (let channel in this.channels)
			broadcast(channel, Message.part(channel, this.username))
		this.close()
		delete names[this.username]
		console.error(error)
	}

	function backlog() {
		return ["nothing yo"]
	}

	function broadcast (channel, what) {
		server.clients.forEach(client => {
			client.send(what)
		})
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
