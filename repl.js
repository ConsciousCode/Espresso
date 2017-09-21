'use strict';

const
	fs = require('fs'),
	util = require('util'),
	readline = require('readline'),
	{ Parser } = require('./src/parser'),
	{ Interpreter } = require("./src/interpret");

let env = new Interpreter();

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

rl.on('line', line => {
	sigint = 0;
	
	let m = /^\s*#:\s*(:|\S+)(.*)/.exec(line);
	if(m) {
		switch(m[1].toLowerCase()) {
			case 'include':
				E(fs.readFileSync(m[2].trim()).toString());
				return;
			
			case 'globals':
				P(Object.keys(env.global.vars).join(" "));
				return;
			
			case 'help':
				console.log("#:help");
				console.log("#:reset (callstack)");
				console.log("#:globals");
				console.log("#:eval <js> (#:: also works)");
				console.log("#:bt (backtrace)");
				console.log("#:dump [n] (callstack)");
				console.log("#:include <filename>");
				console.log("#:keys <ident>");
				rl.prompt();
				return;
			
			case 'eval':
			case ":":
				P(eval(m[2]));
				return;
			
			case 'bt':
				let stack = [];
				for(let s of env.callstack) {
					stack.push(`${s.name} (${s.args.map(v => util.inspect(v)).join(', ')})`);
				}
				P(stack.join('\n'));
				return;
			
			case 'dump':
				let n = parseInt(m[2].trim());
				if(isNaN(n)) {
					console.log(env.callstack);
				}
				else {
					console.log(util.inspect(env.callstack[n], {
						showHidden: false,
						depth: null
					}));
				}
				rl.prompt();
				return;
			
			case "keys":
				console.log(Object.keys(env.deref(m[2].trim())).join(" "));
				rl.prompt();
				return;
			
			case "reset":
				let i = 0;
				while(env.callstack.length > 1) {
					++i;
					env.callstack.pop();
				}
				console.log("Removed", i, "frames");
				rl.prompt();
				return;
			
			default:
				console.log("Unknown command", m[1])
				return;
		}
	}
	else {
		E(line);
	}
});
rl.on('close', () => {
	console.log();
	process.exit(0);
})

function E(code) {
	try {
		P(env.exec(new Parser(code).parseScript()));
	}
	catch(e) {
		console.error(e);
		rl.prompt();
	}
}

function P(value) {
	console.log(value);
	rl.prompt();
}

console.log("Enter #:help for repl commands");
rl.prompt();
