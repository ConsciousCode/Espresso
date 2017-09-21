import * as Node from './nodes';

function visit(n, v) {
	if(n) {
		let name = n.__proto__.constructor.name;
		
		if(v[name]) {
			return v[name](n);
		}
		else {
			throw new Error(`Not implemented: ${name}`)
		}
	}
}

export class SymbolTable {
	vars: object;
	
	constructor(v: object = {}) {
		this.vars = v;
	}
	
	deref(k: string): any {
		return this.vars[k];
	}
	
	assign(k: string, v: any): any {
		return this.vars[k] = v;
	}
}

class EspFunction {
	name: string;
	defs: Node.FunctionParameter[];
	body: Node.Expression;
	
	constructor(name: string, defs, body) {
		this.name = name;
		this.defs = defs;
		// Add an extra return to normalize execution
		this.body = new Node.ReturnExpression(body);
	}
	
	call(env: Interpreter, self: any, args: any[]): any {
		if(args.length != this.defs.length) {
			throw new Error("Argument length mismatch");
		}
		
		for(let i = 0; i < args.length; ++i) {
			env.assign(this.defs[i].id.name, args[i]);
		}
		
		env.visit(this.body);
		
		return env.ret;
	}
}

class EspNativeFunction {
	name: string;
	func: Function;
	
	constructor(name: string, func: Function) {
		this.name = name;
		this.func = func;
	}
	
	call(env: Interpreter, self: any, args: Node.Expression[]): any {
		return env.ret = this.func.call(self, args);
	}
}

const nil = null;

const esp_globals = {
	g_isAlpha: new EspNativeFunction(
		"g_isAlpha", function(args) {
			// test coerces objects into strings >:(
			if(typeof args[0] !== 'string') {
				return false;
			}
			return /[a-z]+/i.test(args[0]);
		}
	),
	g_isDigit: new EspNativeFunction(
		"g_isDigit", function(args) {
			if(typeof args[0] !== 'string') {
				return false;
			}
			return /\d+/.test(args[0]);
		}
	),
	g_isSpace: new EspNativeFunction(
		"g_isSpace", function(args) {
			if(typeof args[0] !== 'string') {
				return false;
			}
			return /\s+/.test(args[0]);
		}
	),
	g_print: new EspNativeFunction(
		"g_print", function(args) {
			console.log.apply(console.log, args);
			return nil;
		}
	)
};

export class CallFrame {
	name: string;
	args: any[];
	
	local: SymbolTable;
	self: any;
	
	constructor(self, name: string, args: any[]) {
		this.name = name;
		this.args = args;
		this.local = new SymbolTable();
		this.self = self;
	}
	
	deref(k: string): any {
		if(k === 'this') {
			return this.self;
		}
		
		return this.local.deref(k);
	}
	
	assign(k: string, v: any): any {
		if(k === 'this') {
			throw new Error("Cannot assign to this");
		}
		
		return this.local.assign(k, v);
	}
}

export class Interpreter {
	callstack: CallFrame[];
	global: SymbolTable;
	skip: boolean;
	ret: any;
	
	constructor() {
		this.callstack = [];
		this.global = new SymbolTable();
		for(let name in esp_globals) {
			this.global.assign(name, esp_globals[name]);
		}
		
		this.skip = false;
		this.ret = null;
	}
	
	visit(n) {
		if(!this.skip) {
			return visit(n, this);
		}
	}
	
	exec(v) {
		return this.visit(v);
	}
	
	deref(name: string): any {
		if(this.callstack.length) {
			let v = this.callstack[this.callstack.length - 1].deref(name);
			
			if(typeof v === 'undefined') {
				/* fall through */
			}
			else {
				return v;
			}
		}
		
		return this.global.deref(name);
	}
	
	assign(name: string, value: any): any {
		if(this.callstack.length) {
			return this.callstack[this.callstack.length - 1].assign(name, value);
		}
		else {
			return this.global.assign(name, value);
		}
	}
	
	pushcall(self: any, name: string, args: any[]) {
		this.callstack.push(new CallFrame(self, name, args));
	}
	
	popcall() {
		if(this.callstack.length) {
			this.callstack.pop();
		}
		else {
			throw new Error("Attempted to pop global scope");
		}
	}
	
	Identifier(n: Node.Identifier) {
		return this.deref(n.name);
	}
	
	BreakExpression(n: Node.BreakExpression) {
		throw new Error("Not implemented: Break");
	}
	
	ContinueExpression(n: Node.ContinueExpression) {
		throw new Error("Not implemented: Continue");
	}
	
	ReturnExpression(n: Node.ReturnExpression) {
		if(this.callstack.length < 1) {
			throw new Error("Attempting to return from global context");
		}
		
		let v = this.visit(n.argument);
		
		if(!this.skip) {
			this.skip = true;
			return this.ret = v;
		}
	}
	
	FailExpression(n: Node.FailExpression) {
		let val = this.visit(n.argument);
		throw val;
	}
	
	Literal(n: Node.Literal) {
		return n.value;
	}
	
	ThisExpression(n: Node.ThisExpression) {
		return this.deref('this');
	}
	
	NewExpression(n: Node.NewExpression) {
		let
			proto = this.visit(n.callee),
			self = Object.create(proto),
			args = n.arguments.map(v => this.visit(v));
		
		this.pushcall(self, "<new>", args);
		proto['new'].call(this, self, args);
		this.popcall();
		
		this.skip = false;
		return self;
	}
	
	CallExpression(n: Node.CallExpression) {
		let
			callee = this.visit(n.callee),
			args = n.args.map(v => this.visit(v));
		
		if(n.type === '(') {
			this.pushcall(nil, callee.name, args);
			
			if(callee instanceof Function) {
				this.ret = callee.apply(null, args);
			}
			else {
				callee.call(this, nil, args);
			}
			
			this.popcall();
			
			this.skip = false;
			return this.ret;
		}
		else if(n.type === '[') {
			if(args.length > 1) {
				console.log("[] with more than one arg");
			}
			return callee[args[0]];
		}
		else if(n.type === "{") {
			throw new Error("Block call");
		}
	}
	
	MethodCallExpression(n: Node.MethodCallExpression) {
		let
			self = this.visit(n.self),
			callee = this.visit(n.callee),
			args = n.args.map(v => this.visit(v));
		
		if(n.type === '(') {
			let func = self[callee];
			
			this.pushcall(self, func.name, args);
			
			if(func instanceof Function) {
				this.ret = func.apply(self, args);
			}
			else {
				self[callee].call(this, self, args);
			}
			
			this.popcall();
			
			this.skip = false;
			return this.ret;
		}
		else if(n.type == '[') {
			return self[callee][args[0]];
		}
		else if(n.type === "{") {
			throw new Error("{} method call");
		}
	}
	
	UnaryExpression(n: Node.UnaryExpression) {
		let val = this.visit(n.argument);
		
		switch(n.operator) {
			case 'not': return !val;
			
			default:
				throw new Error(`Unknown unary operator ${n.operator}`);
		}
	}
	
	Group(n: Node.Group) {
		let last = nil;
		for(let e of n.elems) {
			if(e) {
				last = this.visit(e);
			}
			else {
				//last = nil;
			}
		}
		
		return last;
	}
	
	BinaryExpression(n: Node.BinaryExpression) {
		// Implement short-circuiting
		if(n.operator == 'and') {
			let lhs = this.visit(n.left);
			if(lhs) {
				return this.visit(n.right);
			}
			return lhs;
		}
		else if(n.operator == 'or') {
			let lhs = this.visit(n.left);
			if(lhs) {
				return lhs;
			}
			return this.visit(n.right);
		}
		
		let lhs = this.visit(n.left), rhs = this.visit(n.right);
		
		switch(n.operator) {
			case "+": return lhs + rhs;
			case "-": return lhs - rhs;
			case "*": return lhs * rhs;
			case "/": return lhs / rhs;
			case "%": return lhs % rhs;
			
			case ">": return lhs > rhs;
			case ">=": return lhs >= rhs;
			case "<": return lhs < rhs;
			case "<=": return lhs <= rhs;
			case "==": return lhs === rhs;
			case "!=": return lhs !== rhs;
			
			/*
			case "or": return lhs || rhs;
			case "and": return lhs && rhs;
			*/
			
			default:
				throw new Error(`Unknown binary operator ${n.operator}`);
		}
	}
	
	AccessExpression(n: Node.AccessExpression) {
		let lhs = this.visit(n.left);
		if(n.right instanceof Node.Identifier) {
			return lhs[n.right.name];
		}
		else {
			return lhs[this.visit(n.right)];
		}
	}
	
	IdentAssignExpression(n: Node.IdentAssignExpression) {
		return this.assign(n.name.name, this.visit(n.value));
	}
	
	AccessAssignExpression(n: Node.AccessAssignExpression) {
		return this.visit(n.left)[
			this.visit(n.right)
		] = this.visit(n.value);
	}
	
	CallAssignExpression(n: Node.CallAssignExpression) {
		switch(n.type) {
			case "(": throw new Error("Call assignment");
			case '[':
				// Assumption: arguments of length 1
				return this.visit(n.callee)[
					this.visit(n.arguments[0])
				] = this.visit(n.value);
			case "{": throw new Error("Brace assignment");
		}
	}
	
	FunctionExpression(n: Node.FunctionExpression) {
		let f = new EspFunction(
			n.name?n.name.name : "<anon>", n.defs, n.body
	);
		
		if(n.name) {
			this.assign(n.name.name, f);
		}
		return f;
	}
	
	WhileExpression(n: Node.WhileExpression) {
		while(this.visit(n.test)) {
			this.visit(n.body);
		}
		
		return nil;
	}
	
	IfChain(n: Node.IfChain) {
		for(let ic of n.clauses) {
			if(this.visit(ic.test)) {
				return this.visit(ic.body);
			}
		}
		
		if(n.alt) {
			return this.visit(n.alt.body);
		}
		
		return nil;
	}
	
	TryExpression(n: Node.TryExpression) {
		throw new Error("No try implementation");
	}
	
	VariableDeclaration(n: Node.VariableDeclaration) {
		let last;
		for(let decl of n.declarations) {
			let init = this.visit(decl.init);
			if(init === null) {
				init = nil;
			}
			last = this.assign(decl.name.name, init);
		}
		
		return last;
	}
	
	ObjectLiteral(n: Node.ObjectLiteral) {
		let val = {};
		for(let p of n.entries) {
			val[this.visit(p.name)] = this.visit(p.value);
		}
		
		return val;
	}
	
	ArrayLiteral(n: Node.ArrayLiteral) {
		return n.values.map(v => this.visit(v));
	}
}
