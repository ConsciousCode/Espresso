import * as Node from './nodes';
import { RawToken, Scanner } from './scanner';
import { Token, TokenName } from './token';
import { Character } from './character';

interface Elseable {
	name: Node.Identifier | null;
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
	":": 0x01,
	',': 0x01,
	'=': 0x01,
	//']': 0,

	// Boolean
	'||': 0x10, 'or': 0x10,
	'&&': 0x11, 'and': 0x11,

	// Pipe operator
	"|>": 0x12,

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
	"(": 0xa0, "[": 0xa0, "{": 0xa0,

	// Referencing
	"::": 0xb0, '.': 0xb1
};

/**
 * Operations that are right-associating
**/
const RIGHTOPS = [';', "(", '[', "{"];

const COMPACT = BINARYOPS[';'] + 1, PARAMETER = BINARYOPS[','];

function summarize_token(tok: RawToken): string {
	return TokenName[tok.type] + "{" + tok.value + "}";
}

/**
 * Parser naming conventions:
 *
 * match* = Return a parsed token or null. Do not consume.
 * expect* = Return a parsed token or throw an error.
 * parse* = The first token has been consumed, parse the
 *  rest and return the result. This will not return null.
 * read* = The first token is unread but predictable.
 *  parse the whole thing and return. This will not return null.
**/
export class Parser {
	readonly scanner: Scanner;

	lookahead: RawToken | null;

	constructor(code: string) {
		this.scanner = new Scanner(code);
		this.lookahead = {
			type: Token.EOF,
			value: ''
		};
		this.nextToken();
	}

	//////////////////////
	/** Error handling **/
	//////////////////////

	summarizePosition(): string {
		return (
			"(ln: " + this.scanner.line +
			", col: " + this.scanner.col + "):" +
			this.scanner.index
		)
	}

	unexpectedToken(tok: RawToken): Error {
		return new Error(
			"Unexpected " + summarize_token(tok) + " at " +
			this.summarizePosition()
		);
	}

	////////////////////////////
	/** Low-level processing **/
	////////////////////////////

	consumeToken(): RawToken {
		return this.lookahead = this.scanner.lex();
	}

	nextToken(): RawToken {
		if(this.lookahead) {
			return this.lookahead;
		}

		return this.consumeToken();
	}
	
	eof(): boolean {
		return this.nextToken().type === Token.EOF;
	}

	/// Expect specific tokens, else error

	expect(type: Token, value: string): RawToken {
		const token = this.nextToken();
		if(token.type !== type || token.value !== value) {
			throw new Error(
				"Expected " + summarize_token({
					type, value: value || ""
				}) +
				", got " + summarize_token(token) +
				" " + this.summarizePosition()
			);
		}

		this.consumeToken();

		return token;
	}

	expectPunctuator(value: string): RawToken {
		return this.expect(Token.Punctuator, value);
	}

	expectAny(type: Token): RawToken {
		const token = this.nextToken();
		if(token.type !== type) {
			throw new Error(
				"Expected " + summarize_token({
					type, value: "<any>"
				}) +
				", got " + summarize_token(token) +
				" " + this.summarizePosition()
			);
		}

		this.consumeToken();

		return token;
	}

	expectIdentifier(): Node.Identifier {
		return new Node.Identifier(this.expectAny(Token.Identifier).value);
	}

	expectKeyword(keyword: string): RawToken {
		const tok = this.nextToken();
		if(tok.type !== Token.Keyword || tok.value !== keyword) {
			throw this.unexpectedToken(tok);
		}
		return tok;
	}

	/// Try to match, else return null

	match(type: Token, value: string): RawToken | null {
		let tok = this.nextToken();
		if(tok.type === type && tok.value === value) {
			return tok;
		}
		return null;
	}

	matchAny(type: Token): RawToken | null {
		let tok = this.nextToken()
		if(tok.type === type) {
			return tok;
		}
		return null;
	}

	matchPunctuator(value: string): RawToken | null {
		return this.match(Token.Punctuator, value);
	}

	matchKeyword(value: string): RawToken | null {
		return this.match(Token.Keyword, value);
	}
	
	//////////////////////
	/** Clause parsing **/
	//////////////////////
	
	readAsClause(): Node.AsClause|null {
		if(this.matchKeyword('as')) {
			this.consumeToken();
			
			return new Node.AsClause(new Node.Identifier(this.expectIdentifier()));
		}
		
		return null;
	}
	
	readElseClause(): Node.ElseClause|null {
		if(this.matchKeyword('else')) {
			this.consumeToken();
			let asc = this.readAsClause();
			return new Node.ElseClause(asc, this.parseStatement());
		}
		
		return null;
	}
	
	////////////////////
	/** Atom parsing **/
	////////////////////

	/**
	 * This parses any non-object literal of the form
	 *  (...) [...] or {...}, as these are all the same
	 *  in Espresso.
	**/
	parseGroup(end: string): Node.Expression {
		let clauses: (Node.Expression | null)[] = [];
		for(;;) {
			// Allow consecutive semicolons
			while(this.matchPunctuator(';')) {
				this.consumeToken();
				clauses.push(null);
			}

			if(this.matchPunctuator(end)) {
				break;
			}

			clauses.push(this.parseExpression(COMPACT));
		}

		// () [] or {}
		if(clauses.length == 0) {
			return new Node.Literal(null);
		}

		// (1) == 1, don't wrap in a block
		if(clauses.length == 1) {
			return clauses[0] as Node.Expression;
		}

		return new Node.Group(clauses);
	}
	
	expectGroup(): Node.Expression {
		let tok = this.nextToken();
		if(tok.type === Token.GroupOpen) {
			return this.parseGroup(Character.toGroupClose(tok.value as string));
		}
		
		throw this.unexpectedToken(tok);
	}

	/**
	 * Parse the parameter definitions clause of a let expression
	**/
	readParamDefs(): Node.FunctionParameter[] {
		let params: Node.FunctionParameter[] = [];
		let start = this.nextToken();

		const END = Character.toGroupClose(start);

		while(!this.matchPunctuator(END)) {
			let
				name = this.expectAny(Token.Identifier),
				def: Node.Expression | null = null;

			if(this.matchPunctuator('=')) {
				this.consumeToken();

				def = this.parseExpression(0);
			}

			params.push(new Node.FunctionParameter(
				new Node.Identifier(name.value as string), def
			));

			if(!this.matchPunctuator(',')) {
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
	readParams(): Node.Expression[] {
		let
			args: Node.Expression[] = [],
			tok = this.nextToken();

		const END = Character.toGroupClose(tok.value as string);

		if(this.matchPunctuator(END)) {
			this.consumeToken();
			return [];
		}
		
		for(;;) {
			args.push(this.parseStatement());
			
			if(!this.matchPunctuator(',')) {
				this.consumeToken();
				break;
			}
		}

		this.expectPunctuator(END);

		return args;
	}

	parseNew() {
		return new Node.NewExpression(
			this.parseStatement(),
			this.readParams()
		);
	}

	/**
	 * Espresso function names must be capable of supporting non-
	 *  identifiers for operator overloads.
	**/
	parseFunctionName(): Node.Identifier|null {
		let tok = this.nextToken();
		
		if(tok.type === Token.GroupOpen) {
			return null;
		}
		
		this.consumeToken();

		return new Node.Identifier(tok.value as string);
	}

	parseFunctionExpression(): Node.FunctionExpression {
		return new Node.FunctionExpression(
			this.parseFunctionName(),
			this.readParamDefs(),
			this.parseExpression(0)
		);
	}

	parseIfExpression(): Node.IfChain {
		let clauses: Node.IfClause[] = [], alt: Node.ElseClause|null = null;
		
		do {
			// Assumption: nextToken is after 'if'
			let asc = this.readAsClause();
			
			clauses.push(
				new Node.IfClause(
					asc,
					this.expectGroup(),
					this.parseExpression(0)
				)
			);

			// This is fairly complicated, so I put it in a block of its own rather
			//  than in the while test
			if(this.matchKeyword('else')) {
				this.consumeToken();
				if(this.matchKeyword('if')) {
					this.consumeToken();
					continue;
				}
				else {
					alt = this.readElseClause();
					break;
				}
			}
		} while(0);

		return new Node.IfChain(clauses, alt);
	}

	parseProto(): Node.Prototype {
		let name = "", tok = this.nextToken();
		if(tok.type === Token.Identifier) {
			name = tok.value as string;
			this.consumeToken();
		}

		return new Node.Prototype(
			name? new Node.Identifier(name) : null,
			this.parseStatement()
		);
	}

	parseImportExpression(): Node.Import {
		return new Node.Import(this.parseStatement());
	}

	parseExportExpression(): Node.Export {
		return new Node.Export(
			this.readAsClause(),
			this.parseStatement()
		);
	}

	parseCaseExpression(): Node.SwitchExpression {
		let value = this.parseExpression(0), when: Node.SwitchCase[] = [];

		let tok = this.nextToken(), nodefault = true;
		while(tok.type === Token.Keyword) {
			let test: Node.Expression|null = null;
			if(tok.value === 'when') {
				test = this.parseExpression(0);

				this.expectKeyword("then");
			}
			else if(tok.value === 'else' && nodefault) {
				nodefault = false;
			}
			else {
				break;
			}

			this.consumeToken();

			when.push(new Node.SwitchCase(
				test, this.parseExpression(0)
			));
		}

		return new Node.SwitchExpression(value, when);
	}

	parseVarBinding(): Node.VariableBinding {
		let
			name = this.expectIdentifier(),
			val: Node.Expression | null = null;

		if(this.matchPunctuator('=')) {
			this.consumeToken();

			val = this.parseStatement();
		}
		return new Node.VariableBinding(name, val);
	}

	parseVarDeclaration(kind: string): Node.VariableDeclaration {
		let
			v: Node.VariableBinding[] = [],
			bind: Node.VariableBinding;

		while(bind = this.parseVarBinding()) {
			v.push(bind);

			if(this.matchPunctuator(',')) {
				this.consumeToken();
			}
			else {
				break;
			}
		}

		return new Node.VariableDeclaration(v, kind);
	}

	parseExec(): Node.ExecBlock {
		return new Node.ExecBlock(this.parseStatement());
	}

	parseDoBlock(): Node.DoBlock {
		return new Node.DoBlock(
			this.parseStatement(),
			// Being a bit clever here, expect 'while' inline
			(this.expectKeyword('while'), this.parseWhileExpression())
		);
	}

	parseWhileExpression(): Node.WhileExpression {
		return new Node.WhileExpression(
			this.readAsClause(),
			this.expectGroup(),
			this.parseStatement(),
			this.readElseClause()
		);
	}

	parseForExpression(): Node.ForExpression {
		return new Node.ForExpression(
			this.readAsClause(),
			this.parseGroup(),
			this.parseStatement(),
			this.readElseClause()
		);
	}

	parseReturnExpression(): Node.ReturnExpression {
		return new Node.ReturnExpression(this.parseStatement());
	}

	parseYieldExpression(): Node.ReturnExpression {
		let delegate = false;
		if(this.matchKeyword('from')) {
			delegate = true;
			this.consumeToken();
		}

		return new Node.YieldExpression(
			this.parseExpression(0), delegate
		);
	}

	parseWithExpression(): Node.WithExpression {
		return new Node.WithExpression(
			this.expectGroup(),
			this.parseStatement()
		);
	}

	parseObjectProperty(): Node.ObjectProperty {
		let tok = this.nextToken(), key: Node.Expression;

		// Key is an expression
		if(Character.isGroupOpen(tok.value as string)) {
			key = this.parseGroup(tok.value as string);
		}
		else if(tok.type == Token.Identifier) {
			// Identifier -> string
			key = new Node.Literal(tok.value);
			this.consumeToken();
		}
		else if(tok.type == Token.NilLiteral) {
			key = new Node.Literal({
				nil: null,
				false: false,
				true: true
			}[tok.value]);
		}
		else {
			throw this.unexpectedToken(tok);
		}

		this.expectPunctuator(":");

		let val = this.parseExpression(COMPACT);

		return new Node.ObjectProperty(key, val);
	}

	parseObjectLiteral(): Node.ObjectLiteral|Node.Literal {
		let
			end = Character.toGroupClose(this.expectAny(Token.Punctuator).value as string),
			props: Node.ObjectProperty[] = [],
			off = 0;

		// $() or $[] or ${}, nil
		if(this.matchPunctuator(end)) {
			return new Node.Literal(null);
		}
		// ${...}
		else if(end == "}") {
			do {
				props.push(this.parseObjectProperty());
			} while(this.matchPunctuator(','));

			this.expectPunctuator(end);
		}
		// $(...) or $[...], sequential objects
		else {
			do {
				let prop = this.parseExpression(COMPACT);
				if(this.matchPunctuator(',')) {
					this.consumeToken();
				}
				else {
					this.expectPunctuator(end);
					break;
				}
			} while(this.matchPunctuator(','));

			this.expectPunctuator(end);

			return new Node.Literal(props);
		}

		this.consumeToken();

		return new Node.ObjectLiteral(props);
	}

	parseAtom() {
		let start = this.scanner.index;
		let tok = this.nextToken(), val, op;

		this.consumeToken();

		switch(tok.type) {
			case Token.BooleanLiteral:
				return new Node.Literal(tok.value === 'true');
			case Token.NilLiteral:
				return new Node.Literal(null);
			case Token.NumericLiteral:
				return new Node.Literal(tok.value as number);
			case Token.StringLiteral:
				return new Node.Literal(tok.value as string);

			case Token.Keyword:
				switch(tok.value) {
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
							this.parseExpression(0)
						);
					case 'with': return this.parseWithExpression();
					case 'this': return new Node.ThisExpression();
					
					default:
						throw this.unexpectedToken(tok);
				}
			
			case Token.GroupOpen:
				return this.parseGroup(tok.value as string);
	
			case Token.Identifier:
				return new Node.Identifier(tok.value as string);
			
			case Token.Punctuator:
				op = UNARYOPS[tok.value];
				if(op) {
					return new Node.UnaryExpression(
						op.value, this.parseExpression(op)
					)
				}
			//... Fallthrough
				
			default:
				throw this.unexpectedToken(tok);
		}
	}

	nextBinaryOperator(minprec: number) {
		let tok = this.matchAny(Token.Punctuator);

		if(tok) {
			let op = BINARYOPS[tok.value];

			if(typeof op !== 'number' || op < minprec) {
				return null;
			}

			this.consumeToken();
			return {
				token: tok, prec: op,
				leftassoc: (RIGHTOPS.indexOf(tok.value as string) == -1) ? 1 : 0
			};
		}

		return null;
	}

	parseExpression(minprec: number): Node.Expression {
		let lhs = this.parseAtom(), op;

		while(op = this.nextBinaryOperator(minprec)) {
			let tv = op.token.value;

			if(Character.isGroupOpen(tv)) {
				lhs = new Node.CallExpression(
					lhs, this.readParams()
				);
				continue;
			}

			let next_min_prec = op.prec + op.leftassoc;

			let rhs = this.parseExpression(next_min_prec);

			lhs = new Node.BinaryExpression(op.token.value, lhs, rhs);
		}

		return lhs;
	}
	
	/**
	 * Expressions which are separated by semicolons.
	**/
	parseStatement(): Node.Expression {
		return this.parseExpression(COMPACT);
	}

	parseScript(): Node.Group {
		// Consume the default EOF token
		this.consumeToken();

		let sub: Node.Expression[] = [];

		for(;;) {
			while(this.matchPunctuator(';')) {
				this.consumeToken();
			}
			if(this.eof()) {
				break;
			}

			sub.push(this.parseExpression(COMPACT));
		}

		return new Node.Group(sub);
	}
}
