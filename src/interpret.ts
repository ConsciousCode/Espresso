import * as Node from './nodes';

function visit(n, v) {
	let name = n.__proto__.constructor.name;
	
	if(v[name]) {
		return v[name](n);
	}
	else {
		throw new Error(`Not implemented: ${name}`)
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
		this.vars[k] = v;
	}
	
	push(v) {
		this.valuestack.push(v);
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
		this.scope[this.scope.length - 1].assign(k, v);
	}
	
	push(v) {
		this.scope[this.scope.length - 1].push(v);
	}
	
	pop() {
		return this.scope[this.scope.length - 1].pop();
	}
}

class EspFunction {
	name: Node.Identifier;
	defs: Node.FunctionParameter[];
	body: Node.Expression;
	
	constructor(name, defs, body) {
		this.name = name;
		this.defs = defs;
		// Add an extra return to normalize execution
		this.body = new Node.ReturnExpression(body);
	}
	
	call(env: Interpreter, self, args) {
		if(args.length != this.defs.length) {
			throw new Error("Argument length mismatch");
		}
		
		env.callstack.push(new CallFrame());
		env.assign('this', self);
		for(let i = 0; i < args.length; ++i) {
			env.assign(this.defs[i].id.name, args[i]);
		}
		
		return env.visit(this.body);
	}
}

class EspObject {
	readonly value: object;
	
	constructor(value) {
		this.value = value;
	}
}

export class Interpreter {
	callstack: CallFrame[];
	
	constructor() {
		this.callstack = [];
	}
	
	makeNil() {
		return null;
	}
	
	visit(n) {
		return visit(n, this);
	}
	
	exec(v) {
		// Global call frame for scope
		this.callstack.push(new CallFrame());
		return this.visit(v);
	}
	
	top() {
		return this.callstack[this.callstack.length - 1];
	}
	
	deref(name: string) {
		return this.top().deref(name);
	}
	
	assign(name: string, value) {
		this.top().assign(name, value);
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
		let c = this.visit(n.callee)['new'], self = {};
		c.call(this, self, n.arguments.map(v => this.visit(v)));
		return new EspObject(self);
	}
	
	ThisExpression(n) {
		return this.deref('this');
	}
	
	CallExpression(n) {
		let
			callee = this.visit(n.callee),
			args = n.args.map(v => this.visit(v.value));
		
		return callee.call(this, this.makeNil(), args);
	}
	
	UnaryExpression(n) {
		throw new Error("No unary operators");
	}
	
	Group(n) {
		let last;
		for(let e of n.elems) {
			if(e) {
				last = this.visit(e);
			}
			else {
				last = this.makeNil();
			}
		}
		
		return last;
	}
	
	BinaryExpression(n) {
		if(n.operator === '=') {
			if(n.left instanceof Node.BinaryExpression) {
				if(n.left.operator === '.') {
					// Decompose x.y = z
					return this.visit(n.left.left)[
						this.visit(n.left.right)
					] = this.visit(n.right);
				}
			}
			else if(n.left instanceof Node.CallExpression) {
				this.visit(n.left)['='].call(
					this, this.visit(n.left.callee), [
						n.left.arguments.map(
							v => this.visit(v)
						), this.visit(n.right)
					]
				)
			}
			
			throw new Error("rvalue in lhs of assignment");
		}
		
		let lhs = this.visit(n.left), rhs = this.visit(n.right);
		
		switch(n.operator) {
			case ".": return lhs[rhs];
			
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
			
			default:
				throw new Error(`Unknown operator ${n.operator}`);
		}
	}
	
	FunctionExpression(n) {
		let f = new EspFunction(n.name, n.defs, n.body);
		
		if(n.name) {
			this.assign(n.name.name, f);
		}
		return f;
	}
	
	WhileExpression(n) {
		while(this.visit(n.test)) {
			this.visit(n.body);
		}
		
		return this.makeNil();
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
			this.assign(decl.name.name, this.visit(decl.init));
		}
	}
}
