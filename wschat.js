#!/usr/bin/env node

const wsserver = require("./src/wsserver.js")
const webserver = require("./src/webserver.js")

function main(args) {
	webserver(8000, "127.0.0.1")
	wsserver(8001, "127.0.0.1") }

main(process.argv.slice(2))
