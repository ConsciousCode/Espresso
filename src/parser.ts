import { assert } from './assert';
import { ErrorHandler } from './error-handler';
import { Messages } from './messages';
import * as Node from './nodes';
import { Comment, RawToken, Scanner, SourceLocation } from './scanner';
import { Syntax } from './syntax';
import { Token, TokenName } from './token';

interface Elseable {
	head: Node.Expression;
	body: Node.Expression;
	alt: Node.Expression | null;
}

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

	// Referencing
	"::": 0xa0, '.': 0xa1
};

/**
 * Operations that are right-associating
**/
const RIGHTOPS = [';'];

const COMPACT = BINARYOPS[';'], PARAMETER = BINARYOPS[','];

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
	
	unexpectedToken(tok) {
		return new Error("Unexpected " + summarize_token(tok));
	}

	/*

	throwError(messageFormat: string, ...values): void {
		const args = Array.prototype.slice.call(arguments, 1);
		const msg = messageFormat.replace(/%(\d)/g,
			(whole, idx) => {
				assert(
					idx < args.length,
					'Message reference must be in range'
				);
				return args[idx];
			}
		);
		
		throw this.errorHandler.createError(
			this.index, this.line, this.column, msg
		);
	}

	// Throw an exception because of the token.
	unexpectedTokenError(token?: any, message?: string): Error {
		let msg = message || Messages.UnexpectedToken;

		let value;
		if (token) {
			if (!message) {
				msg = (function(tt) {
					switch (tt) {
						case Token.EOF:
							return Messages.UnexpectedEOS;
						case Token.Identifier:
							return Messages.UnexpectedIdentifier;
						case Token.NumericLiteral:
							return Messages.UnexpectedNumber;
						case Token.StringLiteral:
							return Messages.UnexpectedString;
						default:
							return Messages.UnexpectedToken;
					}
				})(token.type);
			}
			value = token.value;
		} else {
			value = 'ILLEGAL';
		}

		msg = msg.replace('%0', value);

		if (token && typeof token.lineNumber === 'number') {
			const index = token.start;
			const line = token.lineNumber;
			const lastMarkerLineStart = this.lastMarker.index - this.lastMarker.column;
			const column = token.start - lastMarkerLineStart + 1;
			return this.errorHandler.createError(index, line, column, msg);
		} else {
			const index = this.lastMarker.index;
			const line = this.lastMarker.line;
			const column = this.lastMarker.column + 1;
			return this.errorHandler.createError(index, line, column, msg);
		}
	}
	
	*/

	// Expect the next token to match the specified punctuator.
	// If not, an exception will be thrown.

	expect(type, value?) {
		const token = this.nextToken();
		if (token.type !== type || token.value !== value) {
			throw new Error(
				"Expected " + summarize_token({type, value}) +
				", got " + summarize_token(token)
			);
		}

		this.consumeToken();
	}

	expectPunctuator(value) {
		return this.expect(Token.Punctuator, value);
	}

	// Quietly expect a comma when in tolerant mode, otherwise delegates to expect().
	/*

	expectCommaSeparator() {
		if (this.config.tolerant) {
			const token = this.lookahead;
			if (token.type === Token.Punctuator && token.value === ',') {
				this.nextToken();
			} else if (token.type === Token.Punctuator && token.value === ';') {
				this.nextToken();
				this.tolerateUnexpectedToken(token);
			} else {
				this.tolerateUnexpectedToken(token, Messages.UnexpectedToken);
			}
		} else {
			this.expect(',');
		}
	}
	*/

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

	// Return true if the next token matches the specified contextual keyword
	// (where an identifier is sometimes a keyword depending on the context)

	matchContextualKeyword(keyword) {
		return this.lookahead.type === Token.Identifier && this.lookahead.value === keyword;
	}

	// Return true if the next token is an assignment operator
	/*
	matchAssign() {
		if (this.lookahead.type !== Token.Punctuator) {
			return false;
		}
		const op = this.lookahead.value;
		return op === '=' ||
			op === '*=' ||
			op === '**=' ||
			op === '/=' ||
			op === '%=' ||
			op === '+=' ||
			op === '-=' ||
			op === '<<=' ||
			op === '>>=' ||
			op === '>>>=' ||
			op === '&=' ||
			op === '^=' ||
			op === '|=';
	}

	consumeSemicolon() {
		if (this.match(';')) {
			this.nextToken();
		} else if (!this.hasLineTerminator) {
			if (this.lookahead.type !== Token.EOF && !this.match('}')) {
				this.throwUnexpectedToken(this.lookahead);
			}
			this.lastMarker.index = this.startMarker.index;
			this.lastMarker.line = this.startMarker.line;
			this.lastMarker.column = this.startMarker.column;
		}
	}

	// https://tc39.github.io/ecma262/#sec-array-initializer

	parseSpreadElement(): Node.SpreadElement {
		const node = this.createNode();
		this.expect('...');
		const arg = this.inheritCoverGrammar(this.parseAssignmentExpression);
		return this.finalize(node, new Node.SpreadElement(arg));
	}

	parseArrayInitializer(): Node.ArrayExpression {
		const node = this.createNode();
		const elements: Node.ArrayExpressionElement[] = [];

		this.expect('[');
		while (!this.match(']')) {
			if (this.match(',')) {
				this.nextToken();
				elements.push(null);
			} else if (this.match('...')) {
				const element = this.parseSpreadElement();
				if (!this.match(']')) {
					this.context.isAssignmentTarget = false;
					this.context.isBindingElement = false;
					this.expect(',');
				}
				elements.push(element);
			} else {
				elements.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
				if (!this.match(']')) {
					this.expect(',');
				}
			}
		}
		this.expect(']');

		return this.finalize(node, new Node.ArrayExpression(elements));
	}

	parseObjectPropertyKey(): Node.PropertyKey {
		const node = this.createNode();
		const token = this.nextToken();

		let key: Node.PropertyKey;
		switch (token.type) {
			case Token.StringLiteral:
			case Token.NumericLiteral:
				const raw = this.getTokenRaw(token);
				key = this.finalize(node, new Node.Literal(token.value as string, raw));
				break;

			case Token.Identifier:
			case Token.BooleanLiteral:
			case Token.NullLiteral:
			case Token.Keyword:
				key = this.finalize(node, new Node.Identifier(token.value));
				break;

			case Token.Punctuator:
				if (token.value === '[') {
					key = this.isolateCoverGrammar(this.parseAssignmentExpression);
					this.expect(']');
				} else {
					key = this.throwUnexpectedToken(token);
				}
				break;

			default:
				key = this.throwUnexpectedToken(token);
		}

		return key;
	}

	parseObjectInitializer(): Node.ObjectExpression {
		const node = this.createNode();

		this.expect('{');
		const properties: Node.ObjectExpressionProperty[] = [];
		const hasProto = { value: false };
		while (!this.match('}')) {
			properties.push(this.match('...') ? this.parseSpreadElement() : this.parseObjectProperty(hasProto));
			if (!this.match('}')) {
				this.expectCommaSeparator();
			}
		}
		this.expect('}');

		return this.finalize(node, new Node.ObjectExpression(properties));
	}

	// https://tc39.github.io/ecma262/#sec-left-hand-side-expressions

	parseArguments(): Node.ArgumentListElement[] {
		this.expect('(');
		const args: Node.ArgumentListElement[] = [];
		if (!this.match(')')) {
			while (true) {
				const expr = this.match('...') ? this.parseSpreadElement() :
					this.isolateCoverGrammar(this.parseAssignmentExpression);
				args.push(expr);
				if (this.match(')')) {
					break;
				}
				this.expectCommaSeparator();
				if (this.match(')')) {
					break;
				}
			}
		}
		this.expect(')');

		return args;
	}

	parseNewExpression(): Node.MetaProperty | Node.NewExpression {
		const node = this.createNode();

		const id = this.parseIdentifierName();
		assert(id.name === 'new', 'New expression must start with `new`');

		let expr;
		if (this.match('.')) {
			this.nextToken();
			if (this.lookahead.type === Token.Identifier && this.context.inFunctionBody && this.lookahead.value === 'target') {
				const property = this.parseIdentifierName();
				expr = new Node.MetaProperty(id, property);
			} else {
				this.throwUnexpectedToken(this.lookahead);
			}
		} else if (this.matchKeyword('import')) {
			this.throwUnexpectedToken(this.lookahead);
		} else {
			const callee = this.isolateCoverGrammar(this.parseLeftHandSideExpression);
			const args = this.match('(') ? this.parseArguments() : [];
			expr = new Node.NewExpression(callee, args);
			this.context.isAssignmentTarget = false;
			this.context.isBindingElement = false;
		}

		return this.finalize(node, expr);
	}

	parseLeftHandSideExpression(): Node.Expression {
		assert(this.context.allowIn, 'callee of new expression always allow in keyword.');

		const node = this.startNode(this.lookahead);
		let expr = (this.matchKeyword('super') && this.context.inFunctionBody) ? this.parseSuper() :
			this.inheritCoverGrammar(this.matchKeyword('new') ? this.parseNewExpression : this.parsePrimaryExpression);

		while (true) {
			if (this.match('[')) {
				this.context.isBindingElement = false;
				this.context.isAssignmentTarget = true;
				this.expect('[');
				const property = this.isolateCoverGrammar(this.parseExpression);
				this.expect(']');
				expr = this.finalize(node, new Node.ComputedMemberExpression(expr, property));

			} else if (this.match('.')) {
				this.context.isBindingElement = false;
				this.context.isAssignmentTarget = true;
				this.expect('.');
				const property = this.parseIdentifierName();
				expr = this.finalize(node, new Node.StaticMemberExpression(expr, property));

			} else {
				break;
			}
		}

		return expr;
	}

	parseArrayPattern(params, kind?: string): Node.ArrayPattern {
		const node = this.createNode();

		this.expect('[');
		const elements: Node.ArrayPatternElement[] = [];
		while (!this.match(']')) {
			if (this.match(',')) {
				this.nextToken();
				elements.push(null);
			} else {
				if (this.match('...')) {
					elements.push(this.parseBindingRestElement(params, kind));
					break;
				} else {
					elements.push(this.parsePatternWithDefault(params, kind));
				}
				if (!this.match(']')) {
					this.expect(',');
				}
			}

		}
		this.expect(']');

		return this.finalize(node, new Node.ArrayPattern(elements));
	}

	parseRestProperty(params, kind): Node.RestElement {
		const node = this.createNode();
		this.expect('...');
		const arg = this.parsePattern(params);
		if (this.match('=')) {
			this.throwError(Messages.DefaultRestProperty);
		}
		if (!this.match('}')) {
			this.throwError(Messages.PropertyAfterRestProperty);
		}
		return this.finalize(node, new Node.RestElement(arg));
	}

	parseObjectPattern(params, kind?: string): Node.ObjectPattern {
		const node = this.createNode();
		const properties: Node.ObjectPatternProperty[] = [];

		this.expect('{');
		while (!this.match('}')) {
			properties.push(this.match('...') ? this.parseRestProperty(params, kind) : this.parsePropertyPattern(params, kind));
			if (!this.match('}')) {
				this.expect(',');
			}
		}
		this.expect('}');

		return this.finalize(node, new Node.ObjectPattern(properties));
	}

	parsePattern(params, kind?: string): Node.BindingIdentifier | Node.BindingPattern {
		let pattern;

		if (this.match('[')) {
			pattern = this.parseArrayPattern(params, kind);
		} else if (this.match('{')) {
			pattern = this.parseObjectPattern(params, kind);
		} else {
			if (this.matchKeyword('let') && (kind === 'const' || kind === 'let')) {
				this.tolerateUnexpectedToken(this.lookahead, Messages.LetInLexicalBinding);
			}
			params.push(this.lookahead);
			pattern = this.parseVariableIdentifier(kind);
		}

		return pattern;
	}

	parsePatternWithDefault(params, kind?: string): Node.AssignmentPattern | Node.BindingIdentifier | Node.BindingPattern {
		const startToken = this.lookahead;

		let pattern = this.parsePattern(params, kind);
		if (this.match('=')) {
			this.nextToken();
			const previousAllowYield = this.context.allowYield;
			this.context.allowYield = true;
			const right = this.isolateCoverGrammar(this.parseAssignmentExpression);
			this.context.allowYield = previousAllowYield;
			pattern = this.finalize(this.startNode(startToken), new Node.AssignmentPattern(pattern, right));
		}

		return pattern;
	}
	*/

	parseFunctionExpression(): Node.FunctionExpression | Node.FunctionExpression {
		let name: Node.Identifier | null = null,
			params: Node.FunctionParameter[] = [],
			body;
		let tok = this.nextToken();

		if (tok.type === Token.Identifier) {
			name = new Node.Identifier(tok.value as string);
			this.consumeToken();
		}
		
		this.expectPunctuator("(");
		
		tok = this.nextToken();
		while (tok.value && tok.value != ")") {
			if (tok.type == Token.Identifier) {
				this.consumeToken();
				
				let
					name = new Node.Identifier(tok.value),
					value: Node.Expression | null;
				
				if (this.matchPunctuator('=')) {
					this.consumeToken();
					
					value = this.parseExpression(COMPACT);
				}
				
				if (this.matchPunctuator(")")) {
					this.consumeToken();
				}
			}
			else {
				throw this.unexpectedToken(tok);
			}
			
			tok = this.nextToken();
		}
		
		this.expectPunctuator(")");

		body = this.parseExpression(COMPACT);

		return new Node.FunctionExpression(name as Node.Identifier, params, body, false);
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
	
	parseVarExpression(): Node.VariableDeclaration {
		let tok = this.nextToken(), v: Node.VariableDeclarator[] = [];
		while (tok.type == Token.Identifier) {
			let name = tok.value, init = null;
			
			tok = this.consumeToken();
			
			if (this.matchPunctuator(',')) {
				tok = this.consumeToken();
			}
			else if (this.matchPunctuator('=')) {
				tok = this.consumeToken();
				
				init = this.parseExpression(PARAMETER);
			}
			else {
				v.push(new Node.VariableDeclarator(
					new Node.Identifier(name), init
				));
				break;
			}
			
			v.push(new Node.VariableDeclarator(
				new Node.Identifier(name), init
			));
		}
		
		return new Node.VariableDeclaration(v, 'var');
	}
	
	parseUse(): Node.Use {
		let tok = this.nextToken();
		
		if (tok.type === Token.Identifier) {
			
		}
	}

	parseDoBlock(): Node.DoBlock {
		let body = this.parseExpression(), loop: Node.WhileExpression | null = null;

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

	parseAtom() {
		let start = this.scanner.index;
		let tok = this.nextToken(), val, op;

		this.consumeToken();

		console.log(tok);

		switch (tok.type) {
			case Token.BooleanLiteral:
				return new Node.Literal(tok.value === 'true', tok.value as string);
			case Token.NullLiteral:
				return new Node.Literal(null, tok.value as string);
			case Token.NumericLiteral:
				return new Node.Literal(tok.value as number, tok.value as string);
			case Token.StringLiteral:
				return new Node.Literal(tok.value, tok.value as string);

			case Token.Keyword:
				if (tok.value === 'if') {
					return this.parseIfExpression();
				}
				else if (tok.value === 'var') {
					return this.parseVarExpression();
				}
				else if (tok.value === 'for') {
					return this.parseForExpression();
				}
				else if (tok.value === 'case') {
					return this.parseCaseExpression();
				}
				else if (tok.value === 'while') {
					return this.parseWhileExpression();
				}
				else if (tok.value === 'do') {
					return this.parseDoBlock();
				}
				else if (tok.value === 'let') {
					return this.parseFunctionExpression();
				}
				else if (tok.value === 'proto') {
					return this.parseProto();
				}
				else if (tok.value === 'import') {
					return this.parseImportExpression();
				}
				else if (tok.value === 'export') {
					return this.parseExportExpression();
				}
				else if (tok.value === 'return') {
					return this.parseReturnExpression();
				}
				else if (tok.value === 'yield') {
					return this.parseYieldExpression();
				}
				else if (tok.value === 'fail') {
					return new Node.FailExpression(
						this.parseExpression(COMPACT)
					);
				}
				else if (tok.value === 'with') {
					return this.parseWithExpression();
				}
			case Token.Punctuator:
				// Ignore [ and { for now
				if (tok.value == '(') {
					if (this.matchPunctuator(")")) {
						let stop = this.scanner.index;

						this.consumeToken();
						return new Node.Literal(
							null, this.scanner.source.substring(
								start, stop
							)
						);
					}
					else {
						val = this.parseExpression(0);
						console.log("A");
						this.expectPunctuator(")");
						console.log("B");
						return val;
					}
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

	nextBinaryOperator(minprec: number) {
		let tok = this.nextToken();

		let op = BINARYOPS[tok.value];

		if (typeof op !== 'number' || op < minprec) {
			return null;
		}

		this.consumeToken();
		return {
			token: tok, prec: op,
			leftassoc: (RIGHTOPS.indexOf(tok.value as string) == -1) ? 1 : 0
		};
	}

	parseExpression(minprec?: number) {
		let lhs = this.parseAtom(), op;

		while (op = this.nextBinaryOperator(minprec as number)) {
			let next_min_prec = op.prec + op.leftassoc;

			let rhs = this.parseExpression(next_min_prec);

			lhs = new Node.BinaryExpression(op.token.value, lhs, rhs);
		}

		return lhs;
	}

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
