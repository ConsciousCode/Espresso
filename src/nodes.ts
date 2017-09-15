export type Expression = (
	Literal|Identifier|
	BreakExpression|ContinueExpression|
	ReturnExpression|FailExpression|
	NewExpression|ThisExpression|CallExpression|
	UnaryExpression|BinaryExpression|
	Group|FunctionExpression|
	WhileExpression|IfChain|TryExpression|
	VariableDeclaration
);

export class Identifier {
	readonly name: string;
	constructor(name) {
		this.name = name;
	}
	
	toString() {
		return `Identifier[${name}]`;
	}
}

/// Loop control flow

export class BreakExpression {
	toString() {
		return "Break[]";
	}
}

export class ContinueExpression {
	toString() {
		return "Continue[]";
	}
}

/// Functional control flow

export class ReturnExpression {
	readonly argument: Expression | null;
	constructor(argument: Expression | null) {
		this.argument = argument;
	}
	
	toString() {
		return `Return[${this.argument}]`;
	}
}

export class FailExpression {
	readonly argument: Expression;
	constructor(argument: Expression) {
		this.argument = argument;
	}
	
	toString() {
		return `Fail[${this.argument}]`;
	}
}

export class Literal {
	readonly value: boolean | number | string | Expression[] | null;
	
	constructor(value: boolean | number | string | Expression[] | null) {
		this.value = value;
	}
	
	toString() {
		return `Literal[${this.value}]`;
	}
}

export class NewExpression {
	readonly callee: Expression;
	readonly arguments: CallParameter[];
	
	constructor(callee: Expression, args: CallParameter[]) {
		this.callee = callee;
		this.arguments = args;
	}
}

export class ThisExpression {
	constructor() { }
	
	toString() {
		return "This[]";
	}
}

export class CallParameter {
	readonly name: Expression|null;
	readonly value: Expression;
	
	constructor(name: Expression|null, value: Expression) {
		this.name = name;
		this.value = value;
	}
}

export class CallExpression {
	readonly callee: Expression;
	readonly args: CallParameter[];

	constructor(callee: Expression, args: CallParameter[]) {
		this.callee = callee;
		this.args = args;
	}
	
	toString() {
		return `Call ${this.callee}(${this.args})`;
	}
}

export class UnaryExpression {
	readonly operator: string;
	readonly argument: Expression;
	readonly prefix: boolean;
	constructor(operator, argument) {
		this.operator = operator;
		this.argument = argument;
		this.prefix = true;
	}
	
	toString() {
		return `${this.operator}(${this.argument})`;
	}
}

export class Group {
	readonly elems: (Expression|null)[];

	constructor(elems: (Expression|null)[]) {
		this.elems = elems;
	}
	
	toString() {
		return `${this.elems.map(v => v?v:"").join(";")}`;
	}
}

export class BinaryExpression {
	readonly operator: string;
	readonly left: Expression;
	readonly right: Expression;
	
	constructor(operator: string, left: Expression, right: Expression) {
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
	
	toString() {
		return `(${this.left}) ${this.operator} (${this.right})`;
	}
}

/**
 * The access or dot operator needs special handling. It
 *  can have one of two forms; identifier and operation.
 *  Identifier is the ordinary usage in most other
 *  languages, making this a special-case operator with an
 *  identifier in the rhs. As an operator however, the
 *  rhs can be an expression (e.g. x.("y")). This is
 *  grammatically unambiguous, but encodes two separate
 *  cases in the AST with overlap. That is, x.y is
 *  grammatically the same as x.(y), but means something
 *  different.
**/
export class AccessExpression {
	readonly left: Expression;
	readonly right: Identifier;
	
	constructor(left: Expression, right: Identifier) {
		this.left = left;
		this.right = right;
	}
	
	toString() {
		return `(${this.left}.${this.right})`;
	}
}

export class AssignExpression {
	readonly left: Expression;
	readonly right: Expression;
	
	constructor(left: Expression, right: Expression) {
		this.left = left;
		this.right = right;
	}
	
	toString() {
		return `(${this.left} := ${this.right})`;
	}
}

export class FunctionParameter {
	readonly id: Identifier;
	readonly def: Expression | null;

	constructor(id: Identifier, def: Expression | null) {
		this.id = id;
		this.def = def;
	}
	
	toString() {
		if(this.def) {
			return this.id + "=" + this.def;
		}
		return this.id + "";
	}
}

export class FunctionExpression {
	readonly name: Identifier|null;
	readonly defs: FunctionParameter[];
	readonly body: Expression;
	
	constructor(name: Identifier|null, defs: FunctionParameter[], body: Expression) {
		this.name = name;
		this.defs = defs;
		this.body = body;
	}
	
	toString() {
		return `Let ${this.name}(${this.defs.join()})[${this.body}]`;
	}
}

//////////////
/** Blocks **/
//////////////

/// Loops

export class WhileExpression {
	readonly test: Expression;
	readonly body: Expression;
	
	constructor(test: Expression, body: Expression) {
		this.test = test;
		this.body = body;
	}
	
	toString() {
		return `While[${this.test}, ${this.body}]`;
	}
}

/// Other blocks

export class IfClause {
	readonly test: Expression;
	readonly body: Expression;
	
	constructor(test: Expression, body: Expression) {
		this.test = test;
		this.body = body;
	}
	
	toString() {
		return `If[${this.test}, ${this.body}]`;
	}
}

export class ElseClause {
	readonly body: Expression;
	
	constructor(body: Expression) {
		this.body = body;
	}
	
	toString() {
		return `Else[${this.body}]`;
	}
}

export class IfChain {
	readonly clauses: IfClause[];
	readonly alt: ElseClause|null;
	
	constructor(clauses: IfClause[], alt: ElseClause|null) {
		this.clauses = clauses;
		this.alt = alt
	}
	
	toString() {
		return `IfChain[${this.clauses.join('; ')}; ${this.alt}]`;
	}
}

export class TryExpression {
	readonly body: Expression;
	readonly alt: ElseClause;
	
	constructor(body: Expression, alt: ElseClause) {
		this.body = body;
		this.alt = alt;
	}
	
	toString() {
		return `Try[${this.body}, ${this.alt}]`;
	}
}

/**
 * A single declared variable/pattern (e.g. x = 10).
**/
export class VariableBinding {
	readonly name: Identifier;
	readonly init: Expression | null;

	constructor(name: Identifier, init: Expression | null) {
		this.name = name;
		this.init = init;
	}
	
	toString() {
		return `[${this.name} = ${this.init}]`;
	}
}

/**
 * A full var/def/use declaration (e.g. var x, y = 10, z).
**/
export class VariableDeclaration {
	readonly declarations: VariableBinding[];
	readonly kind: string;
	
	constructor(declarations: VariableBinding[], kind: string) {
		this.declarations = declarations;
		this.kind = kind;
	}
	
	toString() {
		return `${this.kind}[${this.declarations.join()}]`;
	}
}
