"use strict"

const uws = require("uws")
const valid = require("./valid.js")

module.exports = function WSServer (port, hostname) {
	const channels = {}
	const names = {}
	const rpcfun = {
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
		socket.username = null
		socket.channels = {}
	}

	function on_message (message) {
		var obj
		try { 
			obj = JSON.parse(message)
		} catch (e) {
			return this.close("Please don't send invalid JSON")
		}
		if (!valid.RPC(obj))
			this.close("Please don't send invalid RPCs")
		else if (!(obj.fn in rpcfun)) {
			this.close("Method doesn't exist")
		else if (!valid[obj.fn](obj.args))
			this.close("Invalid arguments")
		else
			rpcfun[obj.fn](this, obj.id, ...obj.args)
	}

	function backlog() {
		return ["nothing yo"]
	}

	function broadcast (channel, what) {
		for (let i = 0; i < server.clients.length; i++)
			server.clients[i].send(what)
	}

	function chat (socket, id, channel, msg) {
		if (!(socket.username && socket.channel))
			socket.send(Message.ret(id, (false, "No username or channel")))
		else {
			broadcast(channel, Message.chat(channel, socket.username, msg))
			socket.send(Message.ret(id, (true, true)))
		}
	}

	function name (socket, id, name) {
		if (name in names)
			socket.send(Message.ret(id, (false, "Name already taken")))
		else if (socket.username)
			delete names[socket.username]
		socket.username = this
		socket.send(Message.ret(id, (true, true)))
	}

	function join (socket, id, channel) {
		if (!socket.username)
			socket.send(Message.ret(id, (false, "No username set")))
		else if (channel in socket.channels)
			socket.send(Message.ret(id, (false, "Already in channel " + channel)))
		else if (!(channel in channels))
			socket.send(Message.ret(id, (false, "Channel doesn't exist")))
		else {
			broadcast(channel, Message.join(channel, socket.username))
			socket.send(Message.ret(id, (true, backlog())))
		}
	}

	function part (socket, id, channel) {
		if (!socket.username)
			socket.send(Message.ret(id, (false, "No username set")))
		else if (!channel in socket.channels)
			socket.send(Message.ret(id, (false, "Not in channel")))
		else {
			delete socket.channels[channel]
			broadcast(channel, Message.part(channel, socket.username))
			socket.send(Message.ret(id, (true, true)))
		}
	}

	function priv (socket, id, user, msg) {
		if (!socket.username)
			socket.send(Message.ret(id, (false, "No username set")))
		else if (!names[user])
			socket.send(Message.ret(id, (false, "No such user")))
		else {
			names[user].send(Message.priv(socket.username, msg))
			socket.send(Message.ret(id, (true, true)))
		}
	}
}

class Message {
	static note(text) {
		return JSON.stringify({
			fn: "note",
			args: [text]
		})	}
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
