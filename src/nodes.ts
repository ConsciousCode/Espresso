export type Expression =
	AwaitExpression | BinaryExpression | Identifier | FunctionExpression |
	Literal | NewExpression | ThisExpression | UnaryExpression |
	UpdateExpression | YieldExpression | BreakExpression | ContinueExpression |
	EmptyExpression | ForExpression | IfChain | ReturnExpression |
	SwitchExpression | FailExpression | TryExpression | VariableDeclaration |
	WhileExpression | WithExpression | Import | Export | ExecBlock | Group;

/* tslint:disable:max-classes-per-file */

function string_else(body, el) {
	if(el) {
		return body + " else " + el;
	}
	return body;
}

function string_block(kw, name, body, el) {
	
}

export class EmptyExpression {
	constructor() {}
}

export class Identifier {
	readonly name: string;
	constructor(name) {
		this.name = name;
	}
	
	toString() {
		return name;
	}
}

export class AwaitExpression {
	readonly argument: Expression;
	constructor(argument: Expression) {
		this.argument = argument;
	}
	
	toString() {
		return "await " + this.argument;
	}
}

/// Loop control flow

export class BreakExpression {
	readonly label: Identifier | null;
	constructor(label: Identifier | null) {
		this.label = label;
	}
	
	toString() {
		if(this.label) {
			return "break " + this.label;
		}
		return "break";
	}
}

export class ContinueExpression {
	readonly label: Identifier | null;
	constructor(label: Identifier | null) {
		this.label = label;
	}
	
	toString() {
		if(this.label) {
			return "continue " + this.label;
		}
		return "continue";
	}
}

export class RedoExpression {
	readonly label: Identifier | null;
	constructor(label: Identifier | null) {
		this.label = label;
	}
	
	toString() {
		if(this.label) {
			return "redo " + this.label;
		}
		return "redo";
	}
}

/// Functional control flow

export class ReturnExpression {
	readonly argument: Expression | null;
	constructor(argument: Expression | null) {
		this.argument = argument;
	}
}

export class FailExpression {
	readonly argument: Expression;
	constructor(argument: Expression) {
		this.argument = argument;
	}
}

export class YieldExpression {
	readonly argument: Expression | null;
	readonly delegate: boolean;
	constructor(argument: Expression | null, delegate: boolean) {
		this.argument = argument;
		this.delegate = delegate;
	}
}

export class ExecBlock {
	// Not readonly, may be extended
	readonly body: Expression;
	constructor(body: Expression) {
		this.body = body;
	}
	
	toString() {
		return "exec " + this.body;
	}
}

export class Export {
	readonly name: Identifier | null;
	readonly value: Expression;

	constructor(name: Identifier | null, value: Expression) {
		this.name = name;
		this.value = value;
	}
}

export class Import {
	readonly module: Expression;
	constructor(module: Expression) {
		this.module = module;
	}
}

export class Literal {
	readonly value: boolean | number | string | Expression[] | null;
	constructor(value: boolean | number | string | Expression[] | null) {
		this.value = value;
	}
}

export class ObjectProperty {
	readonly key: Expression | null;
	readonly val: Expression;

	constructor(key: Expression | null, val: Expression) {
		this.key = key;
		this.val = val;
	}
}

export class ObjectLiteral {
	readonly props: ObjectProperty[];

	constructor(props) {
		this.props = props;
	}
}

export class NewExpression {
	readonly callee: Expression;
	readonly arguments: Expression[];
	constructor(callee: Expression, args: Expression[]) {
		this.callee = callee;
		this.arguments = args;
	}
}

export class ThisExpression {
	constructor() { }
}

export class CallExpression {
	readonly callee: Expression;
	readonly args: Expression[];

	constructor(callee: Expression, args: Expression[]) {
		this.callee = callee;
		this.args = args;
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
}

export class Group {
	readonly elems: Expression[];

	constructor(elems: Expression[]) {
		this.elems = elems;
	}
	
	toString() {
		return "(" + this.elems.map(v => v?v:"").join(";") + ")";
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
		return "(" + this.left + ") " +
			this.operator + " (" + this.right + ")";
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
}

export class Super {
	constructor() { }
}

//////////////
/** Blocks **/
//////////////

/// Clauses

export class AsClause {
	readonly name: Identifier;
	
	constructor(name: Identifier) {
		this.name = name;
	}
	
	toString() {
		if(this.name) {
			return "as " + this.name + " ";
		}
		return "";
	}
}

export class ElseClause {
	readonly name: AsClause|null;
	readonly body: Expression;
	
	constructor(name: AsClause|null, body: Expression) {
		this.name = name;
		this.body = body;
	}
	
	toString() {
		return "else " + this.name + this.body;
	}
}

/// Loops

export class Loop {
	readonly name: AsClause;
	readonly body: Expression;
	readonly test: Expression;
	readonly alt: ElseClause;
	
	constructor(name: AsClause, body: Expression, test: Expression, alt: ElseClause) {
		this.name = name;
		this.body = body;
		this.test = test;
		this.alt = alt;
	}
}

export class DoExpression extends Loop {
	toString() {
		return "do " + this.name + this.body + " while " + this.test + " " + this.alt;
	}
}

export class WhileExpression extends Loop {
	toString() {
		return "while " + this.name + this.test + " " + this.body + this.alt;
	}
}

export class ForExpression {
	readonly name: Identifier | null;
	readonly head: Expression;
	readonly body: Expression;
	readonly alt: Expression | null;
	constructor(name: Identifier | null, head: Expression, body: Expression, alt: Expression | null) {
		this.name = name;
		this.head = head;
		this.body = body;
		this.alt = alt;
	}
	
	toString() {
		return "for " + this.name + this.test + " " + this.this.head + this.body;
	}
}

/// Other blocks

export class IfClause {
	readonly asc: AsClause|null;
	
	readonly test: Expression;
	readonly body: Expression;
	
	constructor(asc: AsClause|null, test: Expression, body: Expression) {
		this.asc = asc;
		this.test = test;
		this.body = body;
	}
	
	toString() {
		return "if " + (
			this.name? "as " + this.name + " " : ""
		) + this.test + " " + this.body;
	}
}

export class ElseClause {
	readonly asc: AsClause|null;
	readonly body: Expression;
	
	constructor(asc: AsClause|null, body: Expression) {
		this.asc = asc;
		this.body = body;
	}
}

export class IfChain {
	readonly clauses: IfClause[];
	readonly elclause: ElseClause|null;
	
	constructor(clauses: IfClause[], elclause: ElseClause|null) {
		this.clauses = clauses;
		this.elclause = elclause;
	}
	
	toString() {
		return string_else(
			this.clauses.join('\n'), elclause
		);
	}
}

export class CaseClause {
	readonly test: Expression;
	
	constructor(test: Expression) {
		this.test = test;
	}
}

export class WhenClause {
	readonly test: Expression;
	readonly result: Expression;
	
	constructor(test: Expression, result: Expression) {
		this.test = test;
		this.result = result;
	}
}

export class CaseWhen {
	readonly test: CaseClause;
	readonly when: WhenClause[];
	readonly alt: ElseClause;
	
	constructor(test: CaseClause, when: WhenClause[], alt: ElseClause) {
		this.test = test;
		this.when = when;
		this.alt = alt;
	}
}

export class CatchClause {
	readonly name: Identifier;
	
	constructor(name: Identifier) {
		this.name = name;
	}
}

export class TryExpression {
	readonly name: AsClause;
	readonly body: Expression;
	readonly handle: ElseClause | CatchClause;
	
	constructor(name: AsClause, body: Expression, handle: ElseClause | CatchClause) {
		this.errid = errid;
		this.block = block;
		this.alt = alt;
	}
}

export class WithExpression {
	readonly object: Expression;
	readonly body: Expression;
	readonly alt: ElseClause;
	
	constructor(object: Expression, body: Expression, alt: ElseClause) {
		this.object = object;
		this.body = body;
		this.alt = alt;
	}
}

export class UpdateExpression {
	readonly operator: string;
	readonly argument: Expression;
	readonly prefix: boolean;
	constructor(operator, argument, prefix) {
		this.operator = operator;
		this.argument = argument;
		this.prefix = prefix;
	}
}

export class Prototype {
	readonly name: string;
	readonly value: Expression;

	constructor(name: string, value: Expression) {
		this.name = name;
		this.value = value;
	}
}

/**
 * A pattern for destructing a single object member (e.g. x:y=10).
**/
export class VariablePattern {
	readonly prop: Expression;
	readonly local: Identifier | null;
	readonly def: Expression | null;

	constructor(prop: Expression, local: Identifier | null, def: Expression | null) {
		this.prop = prop;
		this.local = local;
		this.def = def;
	}
}

export enum VariablePatternType {
	SINGLE, PAREN, SQUARE, CURLY
}

type DestructTarget = Identifier[] | VariablePattern[];

/**
 * A collection of one or more identifiers (along with patterns for
 *  destruction) which will be assigned to the init value
 *  (e.g. x or {x, y}).
**/
export class VariableDestruction {
	readonly type: VariablePatternType;
	readonly ids: DestructTarget;

	constructor(type: VariablePatternType, ids: DestructTarget) {
		this.type = type;
		this.ids = ids;
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
}
