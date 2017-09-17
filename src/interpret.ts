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

export class Scope {
	valuestack: any[];
	vars: object;
	blocktype: string;
	
	constructor(v?: object) {
		this.valuestack = [];
		this.vars = v||{};
	}
	
	deref(v) {
		return this.vars[v];
	}
	
	assign(k, v) {
		return this.vars[k] = v;
	}
	
	push(v) {
		return this.valuestack.push(v);
	}
	
	pop() {
		return this.valuestack.pop();
	}
}

export class CallFrame {
	scope: Scope[];
	
	constructor() {
		this.scope = [new Scope()];
	}
	
	deref(v) {
		for(let i = this.scope.length - 1; i >= 0; --i) {
			let x = this.scope[i].deref(v);
			if(typeof x !== 'undefined') {
				return x;
			}
		}
		
		return;
	}
	
	assign(k, v) {
		return this.scope[this.scope.length - 1].assign(k, v);
	}
	
	push(v) {
		return this.scope[this.scope.length - 1].push(v);
	}
	
	pop() {
		return this.scope[this.scope.length - 1].pop();
	}
}

class EspFunction {
	name: Node.Identifier;
	defs: Node.FunctionParameter[];
	body: Node.Expression;
	
	frame: CallFrame;
	
	constructor(name, defs, body, frame) {
		this.name = name;
		this.defs = defs;
		// Add an extra return to normalize execution
		this.body = new Node.ReturnExpression(body);
		
		this.frame = frame;
	}
	
	call(env: Interpreter, self, args) {
		if(args.length != this.defs.length) {
			throw new Error("Argument length mismatch");
		}
		
		// Load the lexical scope
		env.callstack.push(this.frame);
		
		env.callstack.push(new CallFrame());
		env.assign('this', self);
		for(let i = 0; i < args.length; ++i) {
			env.assign(this.defs[i].id.name, args[i]);
		}
		
		// Unload the lexical scope
		env.callstack.pop();
		
		return env.visit(this.body);
	}
}

class EspNativeFunction {
	name: Node.Identifier;
	func: Function;
	
	constructor(func: Function) {
		this.name = new Node.Identifier("<native>");
		this.func = func;
	}
	
	call(env: Interpreter, self, args) {
		return this.func.call(self, args);
	}
}

const nil = null;

function prototype(proto, fields) {
	let value = Object.create(proto);
	for(let k in fields) {
		value[k] = fields[k];
	}
	return value;
}

const esp_globals = {
	g_isAlpha: new EspNativeFunction(function(args) {
		return /[a-z]+/i.test(args[0]);
	}),
	g_isDigit: new EspNativeFunction(function(args) {
		return /\d+/.test(args[0]);
	}),
	object: new EspNativeFunction(function(args) {
		return args;
	})
};

export class Interpreter {
	callstack: CallFrame[];
	
	constructor() {
		this.callstack = [];
	}
	
	visit(n) {
		return visit(n, this);
	}
	
	exec(v) {
		// Global call frame for scope
		this.callstack.push(new CallFrame());
		for(let name in esp_globals) {
			this.assign(name, esp_globals[name]);
		}
		return this.visit(v);
	}
	
	top() {
		return this.callstack[this.callstack.length - 1];
	}
	
	deref(name: string) {
		let v = this.top().deref(name);
		if(typeof v === 'undefined') {
			throw new Error(`${name} is not defined`);
		}
		
		return v;
	}
	
	assign(name: string, value) {
		return this.top().assign(name, value);
	}
	
	Identifier(n) {
		return this.deref(n.name);
	}
	
	Break(n) {
		throw new Error("Not implemented: Break");
	}
	
	Continue(n) {
		throw new Error("Not implemented: Continue");
	}
	
	ReturnExpression(n) {
		let val = this.visit(n.argument);
		this.callstack.pop();
		return val;
	}
	
	FailExpression(n) {
		let val = this.visit(n.argument);
		throw val;
	}
	
	Literal(n) {
		return n.value;
	}
	
	NewExpression(n) {
		let
			proto = this.visit(n.callee),
			self = Object.create(proto);
		
		proto['new'].call(
			this, self,
			n.arguments.map(v => this.visit(v))
		);
		
		return self;
	}
	
	ThisExpression(n) {
		return this.deref('this');
	}
	
	CallExpression(n) {
		let
			callee = this.visit(n.callee),
			args = n.args.map(v => this.visit(v));
		
		if(n.type === '(') {
			return callee.call(this, nil, args);
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
	
	UnaryExpression(n) {
		let val = this.visit(n.argument);
		
		switch(n.operator) {
			case 'not': return !val;
			
			default:
				throw new Error(`Unknown unary operator ${n.operator}`);
		}
	}
	
	Group(n) {
		let last;
		for(let e of n.elems) {
			if(e) {
				last = this.visit(e);
			}
			else {
				last = nil;
			}
		}
		
		return last;
	}
	
	BinaryExpression(n) {
		if(n.operator === '=') {
			// Ordinary usage
			if(n.left instanceof Node.Identifier) {
				return this.assign(n.left.name, this.visit(n.right));
			}
			// x.y = z
			else if(n.left instanceof Node.BinaryExpression) {
				if(n.left.operator === '.') {
					// Decompose x.y = z
					return this.visit(n.left.left)[
						this.visit(n.left.right)
					] = this.visit(n.right);
				}
				
				// Only . operator can be used here, default to error
			}
			// x[y] = z
			else if(n.left instanceof Node.CallExpression) {
				return this.visit(n.left)['='].call(
					this, this.visit(n.left.callee), [
						n.left.arguments.map(
							v => this.visit(v)
						), this.visit(n.right)
					]
				)
			}
			
			throw new Error("rvalue in lhs of assignment");
		}
		
		let lhs = this.visit(n.left), rhs: any;
		
		if(n.operator === '.') {
			if(n.right instanceof Node.Identifier) {
				rhs = n.right.name;
			}
			else {
				rhs = this.visit(n.right);
			}
			
			return lhs[rhs];
		}
		else {
			rhs = this.visit(n.right);
		}
		
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
			case "==": return lhs == rhs;
			case "!=": return lhs != rhs;
			
			case "or": return lhs || rhs;
			case "and": return lhs && rhs;
			
			default:
				throw new Error(`Unknown binary operator ${n.operator}`);
		}
	}
	
	FunctionExpression(n) {
		let f = new EspFunction(n.name, n.defs, n.body, this.top());
		
		if(n.name) {
			this.assign(n.name.name, f);
		}
		return f;
	}
	
	WhileExpression(n) {
		while(this.visit(n.test)) {
			this.visit(n.body);
		}
		
		return nil;
	}
	
	IfChain(n) {
		for(let ic of n.clauses) {
			if(this.visit(ic.test)) {
				return this.visit(ic.body);
			}
		}
		
		return this.visit(n.alt.body);
	}
	
	TryExpression(n) {
		throw new Error("No try implementation");
	}
	
	VariableDeclaration(n) {
		for(let decl of n.declarations) {
			let init = this.visit(decl.init);
			if(init === null) {
				init = nil;
			}
			this.assign(decl.name.name, init);
		}
	}
	
	ObjectLiteral(n) {
		let val = {};
		for(let p of n.entries) {
			val[this.visit(p.name)] = this.visit(p.value);
		}
		
		return val;
	}
	
	ArrayLiteral(n) {
		return n.values.map(v => this.visit(v));
	}
}
