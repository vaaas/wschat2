#!/usr/bin/env node
"use strict"

const wsserver = require("./src/wsserver.js")

function main(args) {
	wsserver(50000, "localhost") }

main(process.argv.slice(2))
