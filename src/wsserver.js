const ws = require("ws")
const util = require("./util.js")
const valid = require("./valid.js")

const channels = new Map()
channels.set("general", new Set())
const nicks = new Map()

function main(port, hostname) {
	const server = new ws.Server({ port: port, host: hostname })
	server.on("connection", on_connection)
	console.log(`Listening to connections on ${hostname}:${port}`)
	return server }

function sensible_name() {
	let x
	do x = ""+util.randint(0, 1e7)
	while (!nicks.has(x))
	return x }

const Message = (x, ...rest) => JSON.stringify({fn: x, args: rest})

function delete_socket_associations(socket) {
	nicks.delete(socket.nick)
	channels.forEach(x => x.delete(this)) }

function on_connection(socket) {
	socket.on("message", on_message)
	socket.on("close", on_close)
	socket.on("error", on_error)
	socket.channels = new Set()
	socket.nick = sensible_name()
	send_nick(socket, socket.nick) }

function on_message(message) {
	try {
		const obj = valid.apply(message)
		exposed[obj.fn](this, obj.id, ...obj.args) }
	catch(e) {
		this.close(e) }}

function on_close(code, message) {
	delete_socket_associations(this) }

function on_error(error) {
	delete_socket_associations(this)
	this.close()
	console.error(error) }

const send_nick = (socket, nick) =>
	socket.send(Message("nick", nick))

const send_chat = (socket, sender, text) =>
	socket.send(Message("chat", sender, text))

const send_ret = (socket, id, error, value) =>
	socket.send(Message("ret", id, error, value))

const send_ok = (socket, id, value) => send_ret(socket, id, null, value)

const send_error = (socket, id, error) => send_ret(socket, id, error, null)

const send_groupchat = (channel, sender, text) => receiver =>
	receiver.send(Message("groupchat", channel, sender, text))

function recv_groupchat(socket, id, channel, msg) {
	if (!socket.channels.has(channel))
		send_error(socket, id, `Channel ${channel} doesn't exist`)
	else
		(channels
		.get(channel)
		.forEach(
		send_groupchat(channel, socket.nick, msg))) }

function recv_nick(socket, id, nick) {
	if (nicks.has(nick))
		return send_error(socket, id, "Nick already taken")
	if (socket.nick)
		nicks.delete(socket.nick)
	nicks.set(nick, socket)
	socket.nick = nick
	send_ok(socket, id, true) }

function recv_join(socket, id, channel) {
	if (socket.channels.has(channel))
		send_error(socket, id, `Already in channel ${channel}`)
	else if (!channels.has(channel))
		send_error(socket, id, "Channel doesn't exist")
	else {
		socket.channels.add(channel)
		channels.get(channel).add(socket)
		send_ok(socket, id, true) }}

function recv_part(socket, id, channel) {
	if (!socket.channels.has(channel))
		send_error(socket, id, "Not in channel")
	else if (!channels.has(channel))
		send_error(socket, id, "Channel doesn't exist")
	else {
		socket.channels.delete(channel)
		channels.get(channel).delete(socket)
		send_ok(socket, id, true) }}

function recv_chat(socket, id, user, msg) {
	if (!nicks.has(user))
		send_error(socket, id, "No such user")
	else send_chat(nicks.get(user), socket.nick, msg) }

const exposed = {
	"groupchat": recv_groupchat,
	"nick": recv_nick,
	"join": recv_join,
	"part": recv_part,
	"chat": recv_chat }

module.exports = main
