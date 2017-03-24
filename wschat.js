#!/usr/bin/env node
"use strict"

const wsserver = require("./src/wsserver.js")

function main(args) {
	const srv = new wsserver(8001, "127.0.0.1", {}, {}, {}) }

main(process.argv.slice(2))
