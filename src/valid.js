const util = require("./util")

function apply(string) {
	let obj
	try {
		const obj = JSON.parse(string) }
	catch (e) {
		throw "don't send invalid JSON" }
	if (!rpc(obj))
		throw "don't send invalid RPCs"
	else if (!(obj.fn in exposed))
		throw "method doesn't exist"
	else if (!exposed[obj.fn](obj.args))
		throw "Invalid arguments"
	else
		return obj }

const rpc = obj => (
	obj.fn !== undefined &&
	typeof(obj.fn) === "string" &&
	obj.args !== undefined &&
	obj.args instanceof Array &&
	obj.id !== undefined &&
	Number.isInteger(obj.id))

const groupchat = args => (
	args.length === 2 &&
	typeof(args[0]) === "string" &&
	typeof(args[1]) === "string" &&
	args[0].length > 0 &&
	args[1].length > 0)

const nick = args => (
	args.length === 1 &&
	typeof(args[0]) === "string" &&
	args[0].length > 0 &&
	!/\s/.test(args[0]))

const join = args => (
	args.length === 1 &&
	typeof(args[0]) === "string" &&
	args[0].length > 0)

const part = args => (
	args.length === 1 &&
	typeof(args[0]) === "string" &&
	args[0].length > 0)

const chat = args => (
	args.length === 2 &&
	typeof(args[0]) === "string" &&
	typeof(args[1]) === "string" &&
	args[0].length > 0 &&
	args[1].length > 0)

const ret = args => (
	args.length === 2 &&
	(typeof(args[0]) === "string" || typeof(args[0]) === null))

const exposed = { chat, groupchat, nick, join, part, ret }

module.exports = { apply, rpc, groupchat, nick, join, part, chat, ret }
