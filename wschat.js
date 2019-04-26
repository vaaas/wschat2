#!/usr/bin/env node

const wsserver = require("./src/wsserver.js")

function main(args) {
	wsserver(8001, "127.0.0.1") }

main(process.argv.slice(2))
