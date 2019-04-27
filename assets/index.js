const app = (function() {
	"use strict"

	const $ = q => document.querySelector(q)

	const $$ = q => Array.from(document.querySelectorAll(q))

	const enable = e => e.disabled = false

	const disable = e => e.disabled = true

	const chars = "abcdefhijklmnopqrstuvwxyz0123456789"

	const randint = (low, high) => Math.floor(low + Math.random()*high)

	const choice = arr => arr[randint(0, arr.length)]

	const send_nick = nick => send_message("nick", [nick], true)

	const send_groupchat = (channel, what) => send_message(false, "groupchat", [what])

	const send_join = channel => send_message("join", [channel], true)

	const send_part = channel => send_message("part", [channel])

	const send_chat = (who, what) => send_message("chat", [who, what])

	const Queue = (function Queue() {
		const queue = new Map()

		const track = id => new Promise(res => queue.set(id, res))

		function resolve(id, args) {
			if (queue.has(id)) queue.get(id)(args) }
		
		return { track, resolve } })()

	async function main() {
		const socket = await connect_to_server(`ws://${window.location.host}:8001`)
		socket.onmessage = recv_message
		const nick = await modal_nickname(socket)
		
		await connect_to_channel(socket, "general")
		enable($("textarea")) }


	function connect_to_server(url) {
		return new Promise(res => {
			const socket = new WebSocket(url)
			socket.onopen = _ => res(socket) })}

	function recv_message(e) {
		const obj = JSON.parse(e.data)
		switch (obj.fn) {
			case "ret":
				Queue.resolve(obj.id, obj.args)
				break } }

	function send_message(fn, args, track=false) {
		if (track) {
			const id = generate_sensible_id()
			const p = Queue.track(id)
			socket.send(JSON.stringify({fn, id, args}))
			return p }
		else
			socket.send(JSON.stringify({fn, args})) }

	function generate_sensible_id() {
		let id = ""
		do id += choice(chars)
		while (id.length < 16)
		return id }

	return { main }
})()

window.onload = app.main()
