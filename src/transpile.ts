import * as Node from './nodes';
import { Visitor, visit } from "./visitor";

const HEADER = (
"let g_isAlpha=v=>" +
	"/^[a-z]+$/i.test(v||0)," +
"g_isDigit=v=>" +
	"/^\d+$/.test(v)," +
"g_isSpace=v=>" +
	"/^\s+$/.test(v)," +
"g_print=(...v)=>" +
	"console.log(...v)," +
"fail=v=>{throw v}," +
"$new=(n,a)=>(" +
	"n=Object.create(n),n.new(n,...a),n);"
);

export class Transpiler implements Visitor {
	constructor() {
	}
	
	visit(n) {
		return visit(n, this);
	}
	
	generate(v) {
		return HEADER + this.visit(v);
	}
	
	Identifier(n: Node.Identifier) {
		return n.name;
	}
	
	BreakExpression(n: Node.BreakExpression) {
		throw new Error("Not implemented: Break");
	}
	
	ContinueExpression(n: Node.ContinueExpression) {
		throw new Error("Not implemented: Continue");
	}
	
	ReturnExpression(n: Node.ReturnExpression) {
		return `return ${this.visit(n.argument)}`;
	}
	
	FailExpression(n: Node.FailExpression) {
		return `fail(${this.visit(n.argument)})`;
	}
	
	Literal(n: Node.Literal) {
		return JSON.stringify(n.value);
	}
	
	ThisExpression(n: Node.ThisExpression) {
		return 'this';
	}
	
	NewExpression(n: Node.NewExpression) {
		return `$new(${this.visit(n.callee)},` +
			`${n.arguments.map(v => this.visit(v))})`;
	}
	
	CallExpression(n: Node.CallExpression) {
		return `${this.visit(n.callee)}.map(` +
			`null,${n.args.map(v => this.visit(v))})`;
	}
	
	MethodCallExpression(n: Node.MethodCallExpression) {
		return `${this.visit(n.callee)}.map(` +
			`${this.visit(n.self)},${n.args.map(v => this.visit(v))})`;
	}
	
	UnaryExpression(n: Node.UnaryExpression) {
		let op = {
			"not": "!"
		}[n.operator] || n.operator;
		
		return `${op}(${this.visit(n.argument)})`;
	}
	
	Group(n: Node.Group) {
		let out: any[] = [];
		for(let e of n.elems) {
			out.push(this.visit(e));
		}
		
		return out.join(';');
	}
	
	BinaryExpression(n: Node.BinaryExpression) {
		let lhs = this.visit(n.left), rhs = this.visit(n.right);
		
		let op = {
			"==": "===",
			"!=": "!==",
			"and": "&&",
			"or": "||"
		}[n.operator] || n.operator;
		
		return `(${lhs})${op}(${rhs})`;
	}
	
	AccessExpression(n: Node.AccessExpression) {
		return `(${this.visit(n.left)})[${this.visit(n.right)})]`;
	}
	
	IdentAssignExpression(n: Node.IdentAssignExpression) {
		return `${n.name.name}=${this.visit(n.value)})`;
	}
	
	AccessAssignExpression(n: Node.AccessAssignExpression) {
		let left = this.visit(n.left), right = this.visit(n.right);
		
		return `(${left})[${right}]=${this.visit(n.value)}`;
	}
	
	CallAssignExpression(n: Node.CallAssignExpression) {
		switch(n.type) {
			case "(": throw new Error("Call assignment");
			case '[':
				// Assumption: arguments of length 1
				let callee = this.visit(n.callee);
				let args = this.visit(n.arguments[0]);
				return `(${callee})[${args}]=${this.visit(n.value)}`;
			case "{": throw new Error("Brace assignment");
		}
	}
	
	FunctionExpression(n: Node.FunctionExpression) {
		let name = "";
		if(n.name) {
			name = ` ${n.name}`;
		}
		
		let defs: string[] = [];
		for(let d of n.defs) {
			let v = d.id.name;
			if(d.def !== null) {
				v += `=${this.visit(d.def)}`;
			}
			defs.push(v);
		}
		
		return `function${name}(${defs}){${this.visit(n.body)}}`;
	}
	
	WhileExpression(n: Node.WhileExpression) {
		return `while(${this.visit(n.test)}){${this.visit(n.body)}}`;
	}
	
	IfChain(n: Node.IfChain) {
		let out = "";
		for(let ic of n.clauses) {
			out += `if(${this.visit(ic.test)}){${this.visit(ic.body)}}`;
		}
		
		if(n.alt) {
			out += `else{${this.visit(n.alt.body)}}`;
		}
		
		return out;
	}
	
	TryExpression(n: Node.TryExpression) {
		throw new Error("No try implementation");
	}
	
	VariableDeclaration(n: Node.VariableDeclaration) {
		var out: string[] = [];
		for(let decl of n.declarations) {
			let v = `${decl.name.name}`, init = this.visit(decl.init);
			if(init !== null) {
				v += `=${init}`;
			}
			
			out.push(v);
		}
		
		return `var ${out.join(',')}`;
	}
	
	ObjectLiteral(n: Node.ObjectLiteral) {
		var out: string[] = [];
		for(let p of n.entries) {
			out.push(`${this.visit(p.name)}:${this.visit(p.value)}`);
		}
		
		return `{${out.join(',')}}`;
	}
	
	ArrayLiteral(n: Node.ArrayLiteral) {
		return `[${n.values.map(v => this.visit(v)).join(',')}]`;
	}
}
