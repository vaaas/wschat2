"use strict"
module.exports = {
	RPC: function RPC (obj) {
		return (
			obj.fn !== undefined &&
			typeof(obj.fn) === "string" &&
			obj.args !== undefined &&
			obj.args instanceof Array &&
			obj.id !== undefined &&
			Number.isInteger(obj.id)
		)
	},
	chat: function chat (args) {
		return (
			args.length === 2 &&
			typeof(args[0]) === "string" &&
			typeof(args[1]) === "string" &&
			args[0].length > 0 &&
			args[1].length > 0
		)
	},
	name: function name (args) {
		return (
			args.length === 1 &&
			typeof(args[0]) === "string" &&
			args[0].length > 0
		)
	},
	join: function join (args) {
		return (
			args.length === 1 &&
			typeof(args[0]) === "string" &&
			args[0].length > 0
		)
	},
	part: function part (args) {
		return (
			args.length === 1 &&
			typeof(args[0]) === "string" &&
			args[0].length > 0
		)
	},
	priv: function priv (args) {
		return (
			args.length === 2 &&
			typeof(args[0]) === "string" &&
			typeof(args[1]) === "string" &&
			args[0].length > 0 &&
			args[1].length > 0
		)
	},
}
