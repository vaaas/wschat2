"use strict"
module.exports = server_factory

const util = require("util")
const uws = require("uws")
const valid = require("./valid.js")

var server
const channels = { "general": new Set() }
const nicks = {}

function sensible_name() {
	var n = ""+Math.floor(Math.random() * 1000000)
	if (n in nicks) return sensible_name()
	else return n }

function Message (fn, ...rest) {
	var obj = { fn: fn, args: [...rest] }
	return JSON.stringify(obj) }

const exposed = {
	groupchat (socket, id, channel, msg) {
		if (!(channel in socket.channels)) {
			remote.ret(socket, id, "Channel '"+channel+"' doesn't exist", null) }
		else channels[channel].forEach(s => {
			remote.groupchat(s, channel, socket.nick, msg) })},

	nick (socket, id, thenick) {
		if (thenick in nicks)
			return remote.ret(socket, id, "Nick already taken", null)
		else if (socket.nick)
			delete nicks[socket.nick]
		nicks[thenick] = socket
		socket.nick = thenick
		remote.ret(socket, id, null, true) },

	join (socket, id, channel) {
		if (channel in socket.channels)
			remote.ret(socket, id, "Already in channel "+channel, null)
		else if (!(channel in channels))
			remote.ret(socket, id, "Channel doesn't exist", null)
		else {
			socket.channels[channel] = true
			channels[channel].add(socket)
			remote.ret(socket, id, null, true) }},

	part (socket, id, channel) {
		if (!(channel in socket.channels))
			remote.ret(socket, id, "Not in channel", null)
		else {
			delete socket.channels[channel] }
			remote.ret(socket, id, null, true) },

	chat (socket, id, user, msg) {
		if (!nicks[user]) return
			//remote.ret(socket, id, "No such user", null)
		else remote.chat(user, socket.nick, msg) }, }

const remote = {
	ret (socket, id, error, value) {
		socket.send(Message("ret", id, error, value))},

	groupchat (socket, channel, sender, text) {
		socket.send(Message("groupchat", channel, sender, text))},

	chat (socket, sender, text) {
		socket.send(Message("chat", sender, text))},

	nick (socket, thenick) {
		socket.send(Message("nick", thenick)) },}

function server_factory (port, hostname) {
	server = new uws.Server({ port: port, host: hostname })
	server.on("connection", on_connection)
	console.log(`Listening to connections on ${hostname}:${port}`)
	return server }

function on_connection (socket) {
	socket.on("message", on_message)
	socket.on("close", on_close)
	socket.on("error", on_error)
	socket.channels = {}
	socket.nick = sensible_name()
	remote.nick(socket, socket.nick) }

function on_message (message) {
	console.log(message)
	var obj
	try { 
		obj = JSON.parse(message) }
	catch (e) {
		return this.close("Please don't send invalid JSON") }
	if (!valid.rpc(obj))
		this.close("Please don't send invalid RPCs")
	else if (!(obj.fn in exposed))
		this.close("Method doesn't exist")
	else if (!valid[obj.fn](obj.args))
		this.close("Invalid arguments")
	else
		exposed[obj.fn](this, obj.id, ...obj.args) }

function on_close (code, message) {
	delete nicks[this.nick] }

function on_error (socket, error) {
	this.close()
	delete nicks[this.nick]
	console.error(error) }
