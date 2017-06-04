import { assert } from './assert';
import { ErrorHandler } from './error-handler';
import { Messages } from './messages';
import * as Node from './nodes';
import { Comment, RawToken, Scanner, SourceLocation } from './scanner';
import { Token, TokenName } from './token';

interface Elseable {
	head: Node.Expression;
	body: Node.Expression;
	alt: Node.Expression | null;
}

const
	GROUPSTART = {")":"(", "]":"[", "}":"{"},
	GROUPEND = {"(":")", "[":"]", "{":"}"};

/**
 * Unary operator precedences.
**/
const UNARYOPS = {
	"+": 0x40, '-': 0x40,
	"~": 0x41, "!": 0x41, 'not': 0x41,
	"++": 0x42, "--": 0x42,

	"::": 0xa0, "@": 0xa2
};

/**
 * Binary operation precedences.
**/
const BINARYOPS = {
	//')': 0,
	// Technical
	';': 0x00,
	":": 0x01,
	',': 0x01,
	'=': 0x01,
	//']': 0,

	// Boolean
	'||': 0x10, 'or': 0x10,
	'&&': 0x11, 'and': 0x11,

	// Comparisons
	'in': 0x20, 'is': 0x20,
	"<": 0x20, "<=": 0x20,
	">": 0x20, ">=": 0x20,
	"==": 0x20, "!=": 0x20,

	// Arithmetic
	'+': 0x30, '-': 0x30,
	'*': 0x31, '/': 0x31, '%': 0x31,

	// (Unary ops)

	// Bitwise
	'|': 0x50,
	'^': 0x51,
	'&': 0x52,
	'<<': 0x53,
	'>>': 0x53,
	'>>>': 0x53,
	
	// Groups
	"(": 0xa0, "[":0xa0, "{": 0xa0,

	// Referencing
	"::": 0xb0, '.': 0xb1
};

/**
 * Operations that are right-associating
**/
const RIGHTOPS = [';', "(", '[', "{"];

const COMPACT = BINARYOPS[';'] + 1, PARAMETER = BINARYOPS[','];

function summarize_token(tok) {
	return TokenName[tok.type] + "{" + tok.value + "}";
}

export class Parser {
	readonly scanner: Scanner;
	readonly errorHandler: ErrorHandler;

	lookahead: RawToken;

	constructor(code: string) {
		this.scanner = new Scanner(code, this.errorHandler);
		this.errorHandler = new ErrorHandler();
		this.lookahead = {
			type: Token.EOF,
			value: '',
			lineNumber: this.scanner.lineNumber,
			lineStart: 0,
			start: 0,
			end: 0
		};
		this.nextToken();
	}
	
	summarizePosition() {
		return "(ln: " + this.scanner.lineNumber +
			", pos: " + this.scanner.index + ")";
	}
	
	unexpectedToken(tok) {
		return new Error(
			"Unexpected " + summarize_token(tok) + " at " +
			this.summarizePosition()
		);
	}

	// Expect the next token to match the specified punctuator.
	// If not, an exception will be thrown.

	expect(type, value) {
		const token = this.nextToken();
		if (token.type !== type || token.value !== value) {
			throw new Error(
				"Expected " + summarize_token({type, value: value || ""}) +
				", got " + summarize_token(token) +
				" " + this.summarizePosition()
			);
		}

		this.consumeToken();
		
		return token;
	}
	
	expectAny(type) {
		const token = this.nextToken();
		if (token.type !== type) {
			throw new Error(
				"Expected " + summarize_token({type, value:"<any>"}) +
				", got " + summarize_token(token) +
				" " + this.summarizePosition()
			);
		}
		
		this.consumeToken();
		
		return token;
	}

	expectPunctuator(value) {
		return this.expect(Token.Punctuator, value);
	}

	// Expect the next token to match the specified keyword.
	// If not, an exception will be thrown.

	expectKeyword(keyword) {
		const token = this.nextToken();
		if (token.type !== Token.Keyword || token.value !== keyword) {
			throw this.unexpectedToken(token);
		}
	}

	match(type, value?) {
		let tok = this.nextToken();
		return tok.type === type && tok.value === value;
	}
	
	matchAny(value) {
		return this.nextToken().value === value;
	}

	matchPunctuator(value) {
		return this.match(Token.Punctuator, value);
	}

	matchKeyword(value) {
		return this.match(Token.Keyword, value);
	}

	/**
	 * Parse the parameter definitions clause of a let expression
	**/
	parseParamDefs(start): Node.FunctionParameter[] {
		let params: Node.FunctionParameter[] = [];
		
		const END = GROUPEND[start];
		
		while (!this.matchPunctuator(END)) {
			let
				name = this.expectAny(Token.Identifier),
				def: Node.Expression | null = null;
			
			if (this.matchPunctuator('=')) {
				this.consumeToken();
				
				def = this.parseExpression(COMPACT);
			}
			
			params.push(new Node.FunctionParameter(
				new Node.Identifier(name.value as string), def
			));
			
			if (!this.matchPunctuator(',')) {
				break;
			}
			
			this.consumeToken();
		}
		
		this.expectPunctuator(END);
		
		return params;
	}
	
	/**
	 * Parse the parameters being provided to a function call
	**/
	parseParams(start) {
		let
			params: Node.ObjectProperty[] = [],
			offset: number = 0;
		
		const END = GROUPEND[start];
		
		while(!this.matchPunctuator(END)) {
			let prop = this.parseObjectProperty(offset);
			if (prop.isArraylike) {
				++offset;
			}
			
			params.push(prop);
			
			if (this.matchPunctuator(',')) {
				this.consumeToken();
				continue;
			}
			else {
				break;
			}
		}
		
		this.expectPunctuator(END);
		
		return new Node.ObjectLiteral(params);
	}
	
	parseNew() {
		let
			callee = this.parseExpression(COMPACT),
			tok = this.nextToken();
		if (tok.value === "(" || tok.value === '[' || tok.value === "{") {
			return new Node.NewExpression(
				callee, this.parseParams(tok.value as string)
			);
		}
		
		return new Node.NewExpression(
			callee, new Node.ObjectLiteral([])
		);
	}
	
	/**
	 * Espresso function names must be capable of supporting non-
	 *  identifiers for operator overloads.
	**/
	parseFunctionName() {
		let n: Node.Identifier | null = null;
		
		if (this.matchPunctuator("(")) {
			return null;
		}
		if (this.matchPunctuator('[')) {
			this.expectPunctuator(']');
			return new Node.Identifier("[]");
		}
		if (this.matchPunctuator('{')) {
			this.expectPunctuator('}');
			return new Node.Identifier("{}");
		}
		
		let tok = this.nextToken();
		this.consumeToken();
		
		return new Node.Identifier(tok.value as string);
	}

	parseFunctionExpression(): Node.FunctionExpression | Node.FunctionExpression {
		let name: Node.Identifier | null = this.parseFunctionName(),
			params: Node.FunctionParameter[] = [],
			body;
		
		let tok = this.nextToken();
		
		if (!(tok.value in GROUPEND)) {
			throw this.unexpectedToken(tok);
		}
		
		this.consumeToken();
		
		return new Node.FunctionExpression(
			name, this.parseParamDefs(tok.value),
			this.parseExpression(COMPACT), false
		);
	}

	parseIfExpression(): Node.IfExpression {
		let consequent: Node.Expression;
		let alternate: Node.Expression | null = null;

		const test = this.parseExpression(COMPACT);
		
		this.consumeThen();

		consequent = this.parseExpression(COMPACT);
		if (this.matchKeyword('else')) {
			this.consumeToken();
			alternate = this.parseExpression(COMPACT);
		}

		return new Node.IfExpression(test, consequent, alternate);
	}
	
	parseProto(): Node.Prototype {
		let name = "", tok = this.nextToken();
		if (tok.type === Token.Identifier) {
			name = tok.value as string;
			this.consumeToken();
		}
		
		return new Node.Prototype(
			name, this.parseExpression(COMPACT)
		);
	}
	
	parseImportExpression(): Node.Import {
		let tok = this.nextToken();
		
		if (tok.type === Token.StringLiteral) {
			this.consumeToken();
			return new Node.Import(tok.value as string, true);
		}
		
		let sub: string[] = [];
		while (tok.type === Token.Keyword || tok.type === Token.Identifier) {
			this.consumeToken();
			sub.push(tok.value as string);
			
			if (this.matchPunctuator('.')) {
				this.consumeToken();
			}
			else {
				break;
			}
		}
		
		return new Node.Import(sub.join('.'), false);
	}
	
	parseExportExpression(): Node.Export {
		let name: Node.Identifier | null = null;
		if (this.matchKeyword("as")) {
			this.consumeToken();
			
			let tok = this.nextToken();
			if (tok.type !== Token.Identifier) {
				throw this.unexpectedToken(tok);
			}
			
			name = new Node.Identifier(tok.value as string);
		}
		
		return new Node.Export(
			name, this.parseExpression(COMPACT)
		);
	}
	
	parseCaseExpression(): Node.SwitchExpression {
		let value = this.parseExpression(COMPACT), when: Node.SwitchCase[] = [];
		
		let tok = this.nextToken(), nodefault = true;
		while (tok.type === Token.Keyword) {
			let test: Node.Expression | null = null;
			if (tok.value === 'when') {
				test = this.parseExpression(COMPACT);
				this.consumeThen();
			}
			else if (tok.value === 'else' && nodefault) {
				nodefault = false;
			}
			else {
				break;
			}
			
			this.consumeToken();
			
			when.push(new Node.SwitchCase(
				test, this.parseExpression(COMPACT)
			));
		}
		
		return new Node.SwitchExpression(value, when);
	}
	
	parseVarPattern(): Node.VariablePattern {
		let
			tok = this.nextToken(),
			key: Node.Expression,
			id: Node.Identifier | null = null,
			def: Node.Expression | null = null;
		
		if (tok.type === Token.Identifier || tok.type == Token.Keyword) {
			this.consumeToken();
			key = new Node.Identifier(tok.value as string);
		}
		else {
			key = this.parseExpression(COMPACT);
		}
		
		if (this.matchPunctuator(":")) {
			this.consumeToken();
			id = new Node.Identifier(
				this.expectAny(Token.Identifier).value as string
			);
			
			if (this.matchPunctuator('=')) {
				this.consumeToken();
				def = this.parseExpression(COMPACT);
			}
		}
		
		return new Node.VariablePattern(key, id, def);
	}
	
	parseVarDestruction(): Node.VariableDestruction {
		let tok = this.nextToken();
		if (tok.type === Token.Identifier) {
			this.consumeToken();
			return new Node.VariableDestruction(
				Node.VariablePatternType.SINGLE,
				[new Node.Identifier(tok.value)]
			)
		}
		else if (tok.value === '(') {
			let ids: Node.Identifier[] = [];
			tok = this.consumeToken();
			
			while (tok.type === Token.Identifier) {
				this.consumeToken();
				
				ids.push(new Node.Identifier(tok.value as string));
				
				if (this.matchPunctuator(',')) {
					tok = this.consumeToken();
				}
				else {
					break;
				}
			}
			
			this.expectPunctuator(")");
			
			return new Node.VariableDestruction(
				Node.VariablePatternType.PAREN, ids
			);
		}
		else if (tok.value === '[') {
			let
				pat: Node.VariablePattern | null = null,
				ids: Node.VariablePattern[] = [];
			this.consumeToken();
			
			while (pat = this.parseVarPattern()) {
				ids.push(pat);
				
				if (this.matchPunctuator(',')) {
					tok = this.consumeToken();
				}
				else {
					break;
				}
			}
			
			this.expectPunctuator("]");
			
			return new Node.VariableDestruction(
				Node.VariablePatternType.SQUARE, ids
			);
		}
		else if (tok.value === "{") {
			let
				pat: Node.VariablePattern,
				ids: Node.VariablePattern[] = [];
			this.consumeToken();
			
			while (pat = this.parseVarPattern()) {
				ids.push(pat);
				
				if (this.matchPunctuator(',')) {
					tok = this.consumeToken();
				}
				else {
					break;
				}
			}
			
			this.expectPunctuator("}");
			
			return new Node.VariableDestruction(
				Node.VariablePatternType.CURLY, ids
			);
		}
		else {
			throw this.unexpectedToken(this.nextToken());
		}
	}
	
	parseVarBinding(): Node.VariableBinding {
		let
			pat = this.parseVarDestruction(),
			val: Node.Expression | null = null;
		
		if (this.matchPunctuator('=')) {
			this.consumeToken();
			
			val = this.parseExpression(COMPACT);
		}
		return new Node.VariableBinding(pat, val);
	}
	
	parseVarDeclaration(kind: string): Node.VariableDeclaration {
		let
			tok = this.nextToken(),
			v: Node.VariableBinding[] = [],
			bind: Node.VariableBinding;
		
		while (bind = this.parseVarBinding()) {
			v.push(bind);
			
			if (this.matchPunctuator(',')) {
				this.consumeToken();
			}
			else {
				break;
			}
		}
		
		return new Node.VariableDeclaration(v, kind);
	}
	
	parseDoBlock(): Node.DoBlock {
		let body = this.parseExpression(COMPACT), loop: Node.WhileExpression | null = null;

		if (this.matchKeyword('while')) {
			this.consumeToken();

			loop = this.parseWhileExpression();
		}

		return new Node.DoBlock(body, loop);
	}

	parseElseable(): Elseable {
		// We want to exclude semicolon chaining
		let
			head = this.parseExpression(COMPACT),
			body = this.parseExpression(0),
			alt = null;

		if (this.matchKeyword('else')) {
			this.consumeToken();
			alt = this.parseExpression(0);
		}

		return { head, body, alt };
	}

	parseWhileExpression(): Node.WhileExpression {
		let { head, body, alt } = this.parseElseable();
		return new Node.WhileExpression(head, body, alt);
	}

	parseForExpression(): Node.ForExpression {
		let { head, body, alt } = this.parseElseable();
		return new Node.ForExpression(head, body, alt);
	}

	parseReturnExpression(): Node.ReturnExpression {
		return new Node.ReturnExpression(this.parseExpression(0));
	}

	parseYieldExpression(): Node.ReturnExpression {
		let delegate = false;
		if (this.matchKeyword('from')) {
			delegate = true;
			this.consumeToken();
		}

		return new Node.YieldExpression(
			this.parseExpression(COMPACT), delegate
		);
	}

	parseWithExpression(): Node.WithExpression {
		return new Node.WithExpression(
			this.parseExpression(COMPACT),
			this.parseExpression(COMPACT)
		);
	}
	
	parseObjectProperty(offset: number): Node.ObjectProperty {
		let
			tok = this.nextToken(),
			ial: boolean = false,
			k: Node.Expression, v: Node.Expression;
		
		if (tok.type === Token.Identifier || tok.type === Token.Keyword) {
			this.consumeToken();
			
			if (this.matchPunctuator(":")) {
				this.consumeToken();
				
				k = new Node.Literal(tok.value as string);
				v = this.parseExpression(COMPACT);
			}
			else {
				ial = true;
				k = new Node.Literal(offset);
				v = new Node.Identifier(tok.value as string);
			}
		}
		else {
			ial = true;
			k = new Node.Literal(offset);
			v = this.parseExpression(COMPACT);
		}
		
		return new Node.ObjectProperty(ial, k, v);
	}
	
	parseObjectLiteral(lhs, starter): Node.ObjectLiteral {
		let
			object: Node.ObjectProperty[] = [],
			offset: number = 0;
		
		if (starter === ":") {
			object.push(new Node.ObjectProperty(
				false, lhs, this.parseExpression(COMPACT)
			));
			
			if (!this.matchPunctuator(',')) {
				return new Node.ObjectLiteral(object);
			}
			
			this.consumeToken();
		}
		else {
			object.push(new Node.ObjectProperty(
				true, new Node.Literal(offset++), lhs
			));
		}
		
		do {
			let prop = this.parseObjectProperty(offset);
			if (prop.isArraylike) {
				++offset;
			}
			
			object.push(prop);
			
			if (this.matchPunctuator(',')) {
				this.consumeToken();
				continue;
			}
			else {
				break;
			}
		} while (true);
		
		return new Node.ObjectLiteral(object);
	}

	nextToken(): RawToken {
		if (this.lookahead) {
			return this.lookahead;
		}

		return this.consumeToken();
	}

	nextIdentifier(): RawToken | null {
		const tok = this.nextToken();
		if (tok.type === Token.Identifier) {
			return tok;
		}

		return null;
	}

	consumeToken(): RawToken {
		return this.lookahead = this.scanner.lex();
	}
	
	consumeThen(): boolean {
		if (this.matchAny('then')) {
			return true;
		}
		
		return false;
	}
	
	parseGroup(end) {
		if (this.matchPunctuator(end)) {
			let stop = this.scanner.index;

			this.consumeToken();
			return new Node.Literal(null);
		}
		else {
			let val = this.parseExpression(0);
			this.expectPunctuator(end);
			return val;
		}
	}

	parseAtom() {
		let start = this.scanner.index;
		let tok = this.nextToken(), val, op;

		this.consumeToken();

		switch (tok.type) {
			case Token.BooleanLiteral:
				return new Node.Literal(tok.value === 'true');
			case Token.NullLiteral:
				return new Node.Literal(null);
			case Token.NumericLiteral:
				return new Node.Literal(tok.value as number);
			case Token.StringLiteral:
				return new Node.Literal(tok.value as string);

			case Token.Keyword:
				switch (tok.value) {
					case 'if': return this.parseIfExpression();
					case 'var': return this.parseVarDeclaration('var');
					case 'for': return this.parseForExpression();
					case 'case': return this.parseCaseExpression();
					case 'while': return this.parseWhileExpression();
					case 'do': return this.parseDoBlock();
					case 'let': return this.parseFunctionExpression();
					case 'new': return this.parseNew();
					case 'proto': return this.parseProto();
					case 'import': return this.parseImportExpression();
					case 'export': return this.parseExportExpression();
					case 'return': return this.parseReturnExpression();
					case 'yield': return this.parseYieldExpression();
					case 'fail':
						return new Node.FailExpression(
							this.parseExpression(COMPACT)
						);
					case 'with': return this.parseWithExpression();
					case 'this': return new Node.ThisExpression();
				}
			//... Fallthrough
			case Token.Punctuator:
				if (tok.value in GROUPEND) {
					return this.parseGroup(GROUPEND[tok.value]);
				}
			//... Fallthrough

			case Token.Identifier:
				op = UNARYOPS[tok.value];
				if (typeof op === 'number') {
					return new Node.UnaryExpression(
						tok.value as string, this.parseExpression(op)
					);
				}
				else if (tok.type === Token.Identifier) {
					return new Node.Identifier(tok.value as string);
				}
			//... Fallthrough

			default:
				throw this.unexpectedToken(tok);
		}
	}

	nextBinaryOperator(minprec: number, semi: boolean) {
		let tok = this.nextToken();

		let op = BINARYOPS[tok.value];
		
		if (semi) {
			if (typeof op !== 'number' || op < minprec) {
				tok = {
					type: Token.Punctuator, value: ';',
					lineNumber: this.scanner.lineNumber,
					lineStart: this.scanner.lineNumber,
					start: 0, end: 0
				};
				
				op = BINARYOPS[';'];
			}
		}
		else {
			if (typeof op !== 'number' || op < minprec) {
				return null;
			}
		}

		this.consumeToken();
		return {
			token: tok, prec: op,
			leftassoc: (RIGHTOPS.indexOf(tok.value as string) == -1) ? 1 : 0
		};
	}

	parseExpression(minprec: number) {
		let lhs = this.parseAtom(), semi = false, op;

		while (op = this.nextBinaryOperator(minprec, semi)) {
			let tv = op.token.value;
			
			semi = false;
			
			// Object literal parsing is a special-case arbitrary
			//  arity operator composed of commas and colons
			if (tv === ',' || tv === ":") {
				lhs = this.parseObjectLiteral(lhs, op.value);
				continue;
			}
			
			if (tv in GROUPEND) {
				lhs = new Node.CallExpression(
					lhs, this.parseParams(tv)
				);
				continue;
			}
			
			if (tv === ';') {
				let tok = this.nextToken();
				semi = true;
				
				if (tok.value === ';' || tok.value in GROUPSTART) {
					//this.consumeToken();
					let nil = new Node.Literal(null);
					if (lhs instanceof Node.Block) {
						lhs.add(nil);
					}
					else {
						lhs = new Node.Block([lhs, nil]);
					}
					continue;
				}
			}
			
			let next_min_prec = op.prec + op.leftassoc;
			
			let rhs = this.parseExpression(next_min_prec);

			lhs = new Node.BinaryExpression(op.token.value, lhs, rhs);
		}

		return lhs;
	}
	
	/*
	parseBlock(): Node.Block {
		let statements: Node.Expression[] = [];
		do {
			let expr = this.parseStatement(0);
			
	}
	*/

	parseScript(): Node.Script {
		// Consume the default EOF token
		this.consumeToken();
		let script = this.parseExpression(0), tok = this.nextToken();
		if (tok.type !== Token.EOF) {
			throw this.unexpectedToken(tok);
		}
		
		return script;
	}
}
