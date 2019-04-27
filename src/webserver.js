const http = require("http")
const fs = require("fs")

module.exports = main

const file_exists = file => new Promise(res =>
	fs.access(
		file,
		fs.constants.R_OK,
		err =>
			err ? res(false) : res(true)))

const determine_mime_type = file => MIMETYPES[extension(file)] || "application/octet-stream"

const extension = file => last(file.split("."))

const first = arr => arr[0]

const last = arr => arr[arr.length-1]

const prefix = (p, x) => p + x

const MIMETYPES = {
	"html": "text/html",
	"txt": "text/plain",
	"css": "text/css",
	"js": "text/javascript" }

async function request_listener(req, res) {
	const pathname = prefix("assets", parse_url(req.url))
	if (await file_exists(pathname))
		serve(res, pathname)
	else
		not_found(res) }

function not_found(res) {
	res.writeHead(404)
	res.end("Not Found") }

function serve(res, pathname) {
	res.writeHead(200, {"Mime-Type": determine_mime_type(pathname) })
	fs.createReadStream(pathname).pipe(res) }

function parse_url(url) {
	let pathname = first(url.split("?"))
	if (pathname.endsWith("/")) pathname += "index.html"
	return decodeURIComponent(pathname) }	

function main(port, hostname) {
	const server = http.createServer(request_listener)
	server.listen(port, hostname)
	return server }
