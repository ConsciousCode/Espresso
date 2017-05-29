export type Expression =
	AwaitExpression | BinaryExpression | Identifier | FunctionExpression |
	Literal | NewExpression | ThisExpression | UnaryExpression |
	UpdateExpression | YieldExpression | BreakExpression | ContinueExpression |
	EmptyExpression | ForExpression | IfExpression | ReturnExpression |
	SwitchExpression | FailExpression | TryExpression | VariableDeclaration |
	WhileExpression | WithExpression | Import | Export | Block | InvalidType;

/* tslint:disable:max-classes-per-file */

/**
 * Shim to keep the compiler from complaining while I replace old
 *  functions that aren't being used.
**/
export class InvalidType {}
export const Invalid = new InvalidType();

export class AwaitExpression {
	readonly argument: Expression;
	constructor(argument: Expression) {
		this.argument = argument;
	}
}

export class BinaryExpression {
	readonly operator: string;
	readonly left: Expression;
	readonly right: Expression;
	constructor(operator: string, left: Expression, right: Expression) {
		const logical = (operator === '||' || operator === '&&');
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
}

export class BreakExpression {
	readonly label: Identifier | null;
	constructor(label: Identifier | null) {
		this.label = label;
	}
}

export class ContinueExpression {
	readonly label: Identifier | null;
	constructor(label: Identifier | null) {
		this.label = label;
	}
}

export class DoBlock {
	readonly body: Expression;
	readonly loop: WhileExpression | null;
	constructor(body: Expression, loop: WhileExpression | null) {
		this.body = body;
		this.loop = loop;
	}
}

export class Block {
	// Not readonly, may be extended
	body: Expression[];
	constructor(body: Expression[]) {
		this.body = body;
	}
	
	add(expr: Expression) {
		this.body.push(expr);
	}
}

export class EmptyExpression {
	constructor() {}
}

export class ForExpression {
	readonly head: Expression;
	readonly body: Expression;
	readonly alt: Expression | null;
	constructor(head: Expression, body: Expression, alt: Expression | null) {
		this.head = head;
		this.body = body;
		this.alt = alt;
	}
}

export class FunctionParameter {
	readonly id: Identifier;
	readonly def: Expression | null;
	
	constructor(id: Identifier, def: Expression | null) {
		this.id = id;
		this.def = def;
	}
}

export class FunctionExpression {
	readonly id: Identifier | null;
	readonly params: FunctionParameter[];
	readonly body: Expression;
	readonly generator: boolean;
	readonly expression: boolean;
	readonly async: boolean;
	constructor(id: Identifier | null, params: FunctionParameter[], body: Expression, generator: boolean) {
		this.id = id;
		this.params = params;
		this.body = body;
		this.generator = generator;
		this.expression = false;
		this.async = false;
	}
}

export class Identifier {
	readonly name: string;
	constructor(name) {
		this.name = name;
	}
}

export class IfExpression {
	readonly test: Expression;
	readonly consequent: Expression;
	readonly alternate: Expression | null;
	constructor(test: Expression, consequent: Expression, alternate: Expression | null) {
		this.test = test;
		this.consequent = consequent;
		this.alternate = alternate;
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
	readonly module: string;
	readonly local: boolean
	constructor(module: string, local: boolean) {
		this.module = module;
		this.local = local;
	}
}

export class Literal {
	readonly value: boolean | number | string | null;
	constructor(value: boolean | number | string | null) {
		this.value = value;
	}
}

export class ObjectProperty {
	readonly isArraylike: boolean;
	readonly key: Expression | null;
	readonly val: Expression;
	
	constructor(ial: boolean, key: Expression | null, val: Expression) {
		this.isArraylike = ial;
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
	readonly arguments: ObjectLiteral;
	constructor(callee: Expression, args: ObjectLiteral) {
		this.callee = callee;
		this.arguments = args;
	}
}

export class ReturnExpression {
	readonly argument: Expression | null;
	constructor(argument: Expression | null) {
		this.argument = argument;
	}
}

export class Script {
	readonly body: Expression[];
	readonly sourceType: string;
	constructor(body: Expression[]) {
		this.body = body;
		this.sourceType = 'script';
	}
}

export class Super {
	constructor() {}
}

export class SwitchCase {
	readonly test: Expression | null;
	readonly consequent: Expression[];
	constructor(test: Expression | null, consequent: Expression[]) {
		this.test = test;
		this.consequent = consequent;
	}
}

export class SwitchExpression {
	readonly discriminant: Expression;
	readonly cases: SwitchCase[];
	constructor(discriminant: Expression, cases: SwitchCase[]) {
		this.discriminant = discriminant;
		this.cases = cases;
	}
}

export class ThisExpression {
	constructor() {}
}

export class FailExpression {
	readonly argument: Expression;
	constructor(argument: Expression) {
		this.argument = argument;
	}
}

export class CallExpression {
	readonly callee: Expression;
	readonly args: ObjectLiteral;
	
	constructor(callee: Expression, args: ObjectLiteral) {
		this.callee = callee;
		this.args = args;
	}
}

export class TryExpression {
	readonly errid: Identifier | null;
	readonly block: Expression;
	readonly alt: Expression | null;
	constructor(errid: Identifier | null, block: Expression, alt: Expression | null) {
		this.errid = errid;
		this.block = block;
		this.alt = alt;
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
	readonly destruct: VariableDestruction;
	readonly init: Expression | null;
	
	constructor(destruct: VariableDestruction, init: Expression | null) {
		this.destruct = destruct;
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

export class WhileExpression {
	readonly test: Expression;
	readonly body: Expression;
	readonly alt: Expression | null;
	constructor(test: Expression, body: Expression, alt: Expression | null) {
		this.test = test;
		this.body = body;
		this.alt = alt;
	}
}

export class WithExpression {
	readonly object: Expression;
	readonly body: Expression;
	constructor(object: Expression, body: Expression) {
		this.object = object;
		this.body = body;
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
