import * as Node from "./nodes";
import { Visitor, visit } from "./visitor";

/*
class Value {
	constructor(id, block) {
		this.id = id;
		this.block = block;
		representation
		this.types = [];
		this.uses = [];
		this.flags = {};
	}
}

class Graph {
	constructor() {
		this.blocks = []
		this.phis = [];
		this.values = [];
	}
}

class Phi {
	constructor(inputs) {
		this.inputs = inputs;
	}
}

class Block {
	constructor(id, graph, first) {
		this.id = id;
		this.graph = graph;
		this.phis = [];
		this.first = first;
		
		this.next = null;
		this.loop = false;
		this.predecessors = [];
		this.dominator = null;
		this.dominated = [];
	}
}

class GraphBuilder {
	constructor(ast) {
		this.visit(ast);
	}
}
*/

class UnaryNode {
	
}

class BinaryNode {
	constructor(op, lhs, rhs) {
		
	}
}

class CallNode {
	
}

type Node = UnaryNode|BinaryNode|CallNode;

class Flow {
	apply(f: Function) {
		f(this.getValue());
	}
}

class Block extends Flow {
	slots: Node[];
	next: Flow;
	
	constructor(value, next) {
		this.value = value;
		this.next = next;
	}
	
	apply(f) {
		next.apply(f);
	}
}

class ReturnFlow extends Flow {
	node: Node.ReturnExpression;
	constructor(node) {
		this.node = node;
	}
	
	apply(f) {
		// Return is a jump, so it eats anything else
		return;
	}
}

class FailFlow extends Flow {
	node: Node.FailExpression;
	constructor(node) {
		this.node = node;
	}
	
	apply(f) {
		// Fail is a jump, so it eats anything else
		return;
	}
}

class JumpFlow extends Flow {
	constructor(node) {
		//this.node = node;
	}
	
	apply(f) {
		// Eat anything else
		return;
	}
}

class IfFlow extends Flow {
	apply(f) {
		// Operations on if are passed to its operands
		
		this.body = f(this.body);
		
		if(this.alt) {
			this.alt = f(this.alt);
		}
	}
}

function apply_op(op, lhs, rhs) {
	if(lhs instanceof Flow) {
		lhs.apply(val => {
			if(rhs instanceof Flow) {
				rhs.apply(val2 =>
					new BinaryNode(
						n.operator, val, val2
					)
				);
				return rhs;
			}
			else {
				return new BinaryNode(n.operator, val, rhs);
			}
		});
		
		return lhs;
	}

	if(rhs instanceof Flow) {
		rhs.apply(val => new BinaryNode(op, lhs, val));
		
		return rhs;
	}
	
	return new BinaryNode(op, lhs, rhs);
}

/**
 * Make implicit operations explicit, such as the implicit branching
 *  of boolean short circuits and statements embedded in expressions
**/
function degenerate(ast) {
	if(ast instanceof Node.NewExpression) {
		
	}
	else {
		return ast;
	}
}

/**
 * Rearranges the AST to make implicit operations explicit.
**/
class TrivialPass implements Visitor {
	BreakExpression(n: Node.BreakExpression) {
		throw new Error("Not implemented: Break");
	}
	
	ContinueExpression(n: Node.ContinueExpression) {
		throw new Error("Not implemented: Continue");
	}
	
	ReturnExpression(n: Node.ReturnExpression) {
		return
	}
	
	FailExpression(n: Node.FailExpression);
	
	Literal(n: Node.Literal);
	
	ThisExpression(n: Node.ThisExpression);
	
	NewExpression(n: Node.NewExpression);
	
	CallExpression(n: Node.CallExpression);
	
	MethodCallExpression(n: Node.MethodCallExpression);
	
	UnaryExpression(n: Node.UnaryExpression);
	
	Group(n: Node.Group) {
		let block = new Block();
		
		for(let e of n.elems) {
			g.push(this.visit(e));
		}
	}
	
	BinaryExpression(n: Node.BinaryExpression) {
		let lhs = this.visit(n.left), rhs = this.visit(n.right);
		
		
		switch(n.operator) {
			case 'and':
				let lhs = this.visit(n.left);
				return new IfFlow(
					lhs, this.visit(n.right), lhs
				);
			case 'or':
				let lhs = this.visit(n.left);
				return new IfFlow(
					lhs, lhs, this.visit(n.right)
				);
			
			default:
				return new BinaryNode(
					n.operator,
					this.visit(n.left), this.visit(n.right)
				)
		}
	}
	
	AccessExpression(n: Node.AccessExpression);
	
	IdentAssignExpression(n: Node.IdentAssignExpression);
	
	AccessAssignExpression(n: Node.AccessAssignExpression);
	
	CallAssignExpression(n: Node.CallAssignExpression);
	
	FunctionExpression(n: Node.FunctionExpression);
	
	WhileExpression(n: Node.WhileExpression);
	
	IfChain(n: Node.IfChain);
	
	TryExpression(n: Node.TryExpression) {
		throw new Error("No try implementation");
	}
	
	VariableDeclaration(n: Node.VariableDeclaration);
	
	ObjectLiteral(n: Node.ObjectLiteral);
	
	ArrayLiteral(n: Node.ArrayLiteral);
}

class CFGBuilder implements Visitor {
	visit(v) {
		return visit(this, v);
	}
	
	Identifier(v: Node.Identifier) {}
	
	BreakExpression(n: Node.BreakExpression) {
		throw new Error("Not implemented: Break");
	}
	
	ContinueExpression(n: Node.ContinueExpression) {
		throw new Error("Not implemented: Continue");
	}
	
	ReturnExpression(n: Node.ReturnExpression) {
		return
	}
	
	FailExpression(n: Node.FailExpression);
	
	Literal(n: Node.Literal);
	
	ThisExpression(n: Node.ThisExpression);
	
	NewExpression(n: Node.NewExpression);
	
	CallExpression(n: Node.CallExpression);
	
	MethodCallExpression(n: Node.MethodCallExpression);
	
	UnaryExpression(n: Node.UnaryExpression);
	
	Group(n: Node.Group) {
		let block = new Block();
		
		for(let e of n.elems) {
			g.push(this.visit(e));
		}
	}
	
	BinaryExpression(n: Node.BinaryExpression) {
		let lhs = this.visit(n.left), rhs = this.visit(n.right);
		
		
		switch(n.operator) {
			case 'and':
				let lhs = this.visit(n.left);
				return new IfFlow(
					lhs, this.visit(n.right), lhs
				);
			case 'or':
				let lhs = this.visit(n.left);
				return new IfFlow(
					lhs, lhs, this.visit(n.right)
				);
			
			default:
				return new BinaryNode(
					n.operator,
					this.visit(n.left), this.visit(n.right)
				)
		}
	}
	
	AccessExpression(n: Node.AccessExpression);
	
	IdentAssignExpression(n: Node.IdentAssignExpression);
	
	AccessAssignExpression(n: Node.AccessAssignExpression);
	
	CallAssignExpression(n: Node.CallAssignExpression);
	
	FunctionExpression(n: Node.FunctionExpression);
	
	WhileExpression(n: Node.WhileExpression);
	
	IfChain(n: Node.IfChain);
	
	TryExpression(n: Node.TryExpression) {
		throw new Error("No try implementation");
	}
	
	VariableDeclaration(n: Node.VariableDeclaration);
	
	ObjectLiteral(n: Node.ObjectLiteral);
	
	ArrayLiteral(n: Node.ArrayLiteral);
}

class Node {
	uses: Node[];
	
	constructor() {
		this.uses = [];
	}
}

class Block extends Node {
	values: Expression[];
	next: Flow;
}

/**
 * Subclass to avoid confusing expressions and statements
**/
class Expression extends Node {}

class Constant extends Expression {
	value: any;
	
	constructor(value: any) {
		super();
		this.value = value;
	}
}

class UnaryNode extends Expression {
	operator: string;
	operand: Expression;
	
	constructor(op: string, x: Expression) {
		super();
		this.operator = op;
		this.operand = x;
	}
}

class BinaryNode extends Expression {
	operator: string;
	lhs: Node;
	rhs: Node;
	
	constructor(op: string, lhs: Expression, rhs: Expression) {
		super();
		this.operator = op;
		this.lhs = lhs;
		this.rhs = rhs;
	}
}


class Flow extends Node {}

class JumpFlow extends Flow {
	readonly type: string;
	target: Block;
	
	constructor(type: string, target: Block) {
		super();
		this.type = type;
		this.target = target;
	}
}

class IfFlow extends Flow {
	cond: Expression;
	body: Block;
	alt: Block;
	
	constructor(cond: Expression, body: Block, alt: Block) {
		super();
		this.cond = cond;
		this.body = body;
		this.alt = alt;
	}
}

class Phi extends Expression {
	inputs: Expression[];
	
	constructor(inputs: Expression[]) {
		super();
		this.inputs = inputs;
	}
}

class Block {
	vars: Expression[];
	next: Flow;
}
