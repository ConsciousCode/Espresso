import * as Node from "./nodes";

export  function visit(n, v) {
	if(n) {
		let name = n.__proto__.constructor.name;
		
		if(v[name]) {
			return v[name](n);
		}
		else {
			throw new Error(`Not implemented: ${name}`);
		}
	}
}

export abstract class Visitor {
	abstract Identifier(n: Node.Identifier);
	
	BreakExpression(n: Node.BreakExpression) {
		throw new Error("No break implementation");
	}
	
	ContinueExpression(n: Node.ContinueExpression) {
		throw new Error("No continue implementation");
	}
	
	abstract ReturnExpression(n: Node.ReturnExpression);
	
	abstract FailExpression(n: Node.FailExpression);
	
	abstract Literal(n: Node.Literal);
	
	abstract ThisExpression(n: Node.ThisExpression);
	
	abstract NewExpression(n: Node.NewExpression);
	
	abstract CallExpression(n: Node.CallExpression);
	
	abstract MethodCallExpression(n: Node.MethodCallExpression);
	
	abstract UnaryExpression(n: Node.UnaryExpression);
	
	abstract Group(n: Node.Group);
	
	abstract BinaryExpression(n: Node.BinaryExpression);
	
	abstract AccessExpression(n: Node.AccessExpression);
	
	abstract IdentAssignExpression(n: Node.IdentAssignExpression);
	
	abstract AccessAssignExpression(n: Node.AccessAssignExpression);
	
	abstract CallAssignExpression(n: Node.CallAssignExpression);
	
	abstract FunctionExpression(n: Node.FunctionExpression);
	
	abstract WhileExpression(n: Node.WhileExpression);
	
	abstract IfChain(n: Node.IfChain);
	
	TryExpression(n: Node.TryExpression) {
		throw new Error("No try implementation");
	}
	
	abstract VariableDeclaration(n: Node.VariableDeclaration);
	
	abstract ObjectLiteral(n: Node.ObjectLiteral);
	
	abstract ArrayLiteral(n: Node.ArrayLiteral);
}
