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
		if (token.type !== type || (value && token.value !== value)) {
			throw new Error(
				"Expected " + summarize_token({type, value: value || ""}) +
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

	parseObjectLiteralPropertyKey(): Node.PropertyKey {
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

	parseObjectLiteralInitializer(): Node.ObjectExpression {
		const node = this.createNode();

		this.expect('{');
		const properties: Node.ObjectExpressionProperty[] = [];
		const hasProto = { value: false };
		while (!this.match('}')) {
			properties.push(this.match('...') ? this.parseSpreadElement() : this.parseObjectLiteralProperty(hasProto));
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

	parseObjectLiteralPattern(params, kind?: string): Node.ObjectPattern {
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
			pattern = this.parseObjectLiteralPattern(params, kind);
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
	
	parseParams(start) {
		let
			params: Node.ObjectProperty[] = [],
			offset: number = 0;
		
		do {
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
		} while (true);
		
		this.expectPunctuator(GROUPEND[start]);
		
		return new Node.ObjectLiteral(params);
	}
	
	parseNew() {
		let
			callee = this.parseExpression(COMPACT),
			tok = this.nextToken();
		if (tok.value === "(" || tok.value === '[' || tok.value === "{") {
			return new Node.NewExpression(
				callee, this.parseParams(GROUPEND[tok.value])
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
		
		this.expectPunctuator("(");
		
		let tok = this.nextToken();
		while (tok.value && tok.value != ")") {
			if (tok.type == Token.Identifier) {
				this.consumeToken();
				
				let
					name = new Node.Identifier(tok.value),
					value: Node.Expression | null = null;
				
				if (this.matchPunctuator('=')) {
					this.consumeToken();
					
					value = this.parseExpression(COMPACT);
				}
				
				params.push(new Node.FunctionParameter(name, value));
				
				if (this.matchPunctuator(")")) {
					break;
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
				this.expect(Token.Identifier).value as string
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
					lhs, this.parseParams(GROUPEND[tv])
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
