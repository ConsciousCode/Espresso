import { Syntax } from './syntax';

export type Expression = AwaitExpression | BinaryExpression | Identifier | FunctionExpression | Literal | NewExpression |
	ThisExpression | UnaryExpression | UpdateExpression | YieldExpression | BreakExpression | ContinueExpression |
	EmptyExpression | ForExpression |
	IfExpression | ReturnExpression | SwitchExpression | FailExpression |
	TryExpression | VariableDeclaration | WhileExpression | WithExpression | Import | Export | Invalid;

/* tslint:disable:max-classes-per-file */

/**
 * Shim to keep the compiler from complaining while I replace old
 *  functions that aren't being used.
**/
export class Invalid { }

export class AwaitExpression {
	readonly type: string;
	readonly argument: Expression;
	constructor(argument: Expression) {
		this.type = Syntax.AwaitExpression;
		this.argument = argument;
	}
}

export class BinaryExpression {
	readonly type: string;
	readonly operator: string;
	readonly left: Expression;
	readonly right: Expression;
	constructor(operator: string, left: Expression, right: Expression) {
		const logical = (operator === '||' || operator === '&&');
		this.type = logical ? Syntax.LogicalExpression : Syntax.BinaryExpression;
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
}

export class BreakExpression {
	readonly type: string;
	readonly label: Identifier | null;
	constructor(label: Identifier | null) {
		this.type = Syntax.BreakExpression;
		this.label = label;
	}
}

export class ContinueExpression {
	readonly type: string;
	readonly label: Identifier | null;
	constructor(label: Identifier | null) {
		this.type = Syntax.ContinueExpression;
		this.label = label;
	}
}

export class DoBlock {
	readonly type: string;
	readonly body: Expression;
	readonly loop: WhileExpression | null;
	constructor(body: Expression, loop: WhileExpression | null) {
		this.type = Syntax.DoBlock;
		this.body = body;
		this.loop = loop;
	}
}

export class EmptyExpression {
	readonly type: string;
	constructor() {
		this.type = Syntax.EmptyExpression;
	}
}

export class ForExpression {
	readonly type: string;
	readonly head: Expression;
	readonly body: Expression;
	readonly alt: Expression | null;
	constructor(head: Expression, body: Expression, alt: Expression | null) {
		this.type = Syntax.ForExpression;
		this.head = head;
		this.body = body;
		this.alt = alt;
	}
}

export class FunctionParameter {
	readonly type: string;
	readonly id: Identifier;
	readonly def: Expression | null;
	
	constructor(id: Identifier, def: Expression | null) {
		this.type = "FunctionParameter";
		this.id = id;
		this.def = def;
	}
}

export class FunctionExpression {
	readonly type: string;
	readonly id: Identifier | null;
	readonly params: FunctionParameter[];
	readonly body: Expression;
	readonly generator: boolean;
	readonly expression: boolean;
	readonly async: boolean;
	constructor(id: Identifier | null, params: FunctionParameter[], body: Expression, generator: boolean) {
		this.type = Syntax.FunctionExpression;
		this.id = id;
		this.params = params;
		this.body = body;
		this.generator = generator;
		this.expression = false;
		this.async = false;
	}
}

export class Identifier {
	readonly type: string;
	readonly name: string;
	constructor(name) {
		this.type = Syntax.Identifier;
		this.name = name;
	}
}

export class IfExpression {
	readonly type: string;
	readonly test: Expression;
	readonly consequent: Expression;
	readonly alternate: Expression | null;
	constructor(test: Expression, consequent: Expression, alternate: Expression | null) {
		this.type = Syntax.IfExpression;
		this.test = test;
		this.consequent = consequent;
		this.alternate = alternate;
	}
}

export class Export {
	readonly type: string;
	readonly name: Identifier | null;
	readonly value: Expression;
	
	constructor(name: Identifier | null, value: Expression) {
		this.name = name;
		this.value = value;
	}
}

export class Import {
	readonly type: string;
	readonly module: string;
	readonly local: boolean
	constructor(module: string, local: boolean) {
		this.type = Syntax.Import;
		this.module = module;
		this.local = local;
	}
}

export class Literal {
	readonly type: string;
	readonly value: boolean | number | string | null;
	readonly raw: string;
	constructor(value: boolean | number | string | null, raw: string) {
		this.type = Syntax.Literal;
		this.value = value;
		this.raw = raw;
	}
}

export class NewExpression {
	readonly type: string;
	readonly callee: Expression;
	readonly arguments: Expression[];
	constructor(callee: Expression, args: Expression[]) {
		this.type = Syntax.NewExpression;
		this.callee = callee;
		this.arguments = args;
	}
}

export class ReturnExpression {
	readonly type: string;
	readonly argument: Expression | null;
	constructor(argument: Expression | null) {
		this.type = Syntax.ReturnExpression;
		this.argument = argument;
	}
}

export class Script {
	readonly type: string;
	readonly body: Expression[];
	readonly sourceType: string;
	constructor(body: Expression[]) {
		this.type = Syntax.Program;
		this.body = body;
		this.sourceType = 'script';
	}
}

export class Super {
	readonly type: string;
	constructor() {
		this.type = Syntax.Super;
	}
}

export class SwitchCase {
	readonly type: string;
	readonly test: Expression | null;
	readonly consequent: Expression[];
	constructor(test: Expression | null, consequent: Expression[]) {
		this.type = Syntax.SwitchCase;
		this.test = test;
		this.consequent = consequent;
	}
}

export class SwitchExpression {
	readonly type: string;
	readonly discriminant: Expression;
	readonly cases: SwitchCase[];
	constructor(discriminant: Expression, cases: SwitchCase[]) {
		this.type = Syntax.SwitchExpression;
		this.discriminant = discriminant;
		this.cases = cases;
	}
}

export class ThisExpression {
	readonly type: string;
	constructor() {
		this.type = Syntax.ThisExpression;
	}
}

export class FailExpression {
	readonly type: string;
	readonly argument: Expression;
	constructor(argument: Expression) {
		this.type = Syntax.FailExpression;
		this.argument = argument;
	}
}

export class TryExpression {
	readonly type: string;
	readonly errid: Identifier | null;
	readonly block: Expression;
	readonly alt: Expression | null;
	constructor(errid: Identifier | null, block: Expression, alt: Expression | null) {
		this.type = Syntax.TryExpression;
		this.errid = errid;
		this.block = block;
		this.alt = alt;
	}
}

export class UnaryExpression {
	readonly type: string;
	readonly operator: string;
	readonly argument: Expression;
	readonly prefix: boolean;
	constructor(operator, argument) {
		this.type = Syntax.UnaryExpression;
		this.operator = operator;
		this.argument = argument;
		this.prefix = true;
	}
}

export class UpdateExpression {
	readonly type: string;
	readonly operator: string;
	readonly argument: Expression;
	readonly prefix: boolean;
	constructor(operator, argument, prefix) {
		this.type = Syntax.UpdateExpression;
		this.operator = operator;
		this.argument = argument;
		this.prefix = prefix;
	}
}

export class Prototype {
	readonly type: string;
	readonly name: string;
	readonly value: Expression;
	
	constructor(name: string, value: Expression) {
		this.type = Syntax.Prototype;
		this.name = name;
		this.value = value;
	}
}

export class VariableDeclaration {
	readonly type: string;
	readonly declarations: VariableDeclarator[];
	readonly kind: string;
	constructor(declarations: VariableDeclarator[], kind: string) {
		this.type = Syntax.VariableDeclaration;
		this.declarations = declarations;
		this.kind = kind;
	}
}

export class VariableDeclarator {
	readonly type: string;
	readonly id: Identifier;
	readonly init: Expression | null;
	constructor(id: Identifier, init: Expression | null) {
		this.type = Syntax.VariableDeclarator;
		this.id = id;
		this.init = init;
	}
}

export class WhileExpression {
	readonly type: string;
	readonly test: Expression;
	readonly body: Expression;
	readonly alt: Expression | null;
	constructor(test: Expression, body: Expression, alt: Expression | null) {
		this.type = Syntax.WhileExpression;
		this.test = test;
		this.body = body;
		this.alt = alt;
	}
}

export class WithExpression {
	readonly type: string;
	readonly object: Expression;
	readonly body: Expression;
	constructor(object: Expression, body: Expression) {
		this.type = Syntax.WithExpression;
		this.object = object;
		this.body = body;
	}
}

export class YieldExpression {
	readonly type: string;
	readonly argument: Expression | null;
	readonly delegate: boolean;
	constructor(argument: Expression | null, delegate: boolean) {
		this.type = Syntax.YieldExpression;
		this.argument = argument;
		this.delegate = delegate;
	}
}
