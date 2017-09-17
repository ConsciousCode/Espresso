'use strict';

const
	readline = require('readline'),
	{ Parser } = require('./src/parser'),
	{ Interpreter } = require("./src/interpret");

let env = new Interpreter()

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let sigint = 0;
rl.on("SIGINT", () => {
	if(++sigint >= 2) {
		rl.close();
	}
	else {
		console.log("\nPress CTRL+C again to quit");
		rl.prompt();
	}
});

rl.on('line', E);
rl.on('close', () => {
	console.log();
	process.exit(0);
})

function E(line) {
	sigint = 0;
	P(env.exec(new Parser(line).parseScript()));
}

function P(value) {
	console.log(value);
	rl.prompt();
}

rl.prompt();
