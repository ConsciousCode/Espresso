import { Character } from './character';
import { Token } from './token';

function hexValue(ch: string): number {
	return '0123456789abcdef'.indexOf(ch.toLowerCase());
}

export interface Position {
	line: number;
	col: number;
	start: number;
	end: number;
}

export interface RawToken {
	type: Token;
	value: string;

	pos?: Position;
}

export class Scanner {
	readonly source: string;
	readonly length: number;

	lookahead: string;

	index: number;
	line: number;
	col: number;

	constructor(code: string) {
		this.source = code;
		this.length = code.length;
		this.index = 0;
		this.line = 1;
		this.col = 0;

		this.lookahead = code[0];
	}

	public eof(): boolean {
		return this.index >= this.length;
	}

	public scanError(msg?: string): Error {
		if(msg) {
			return new Error(
				"Scanning error (" +
				this.line + ":" +
				this.col + "|" +
				this.index + "): " + msg
			);
		}
		return new Error("Unexpected token");
	}
	
	/**
	 * Advance to the next virtual character, changing the
	 *  positional metadata to match.
	**/
	consume(): string {
		let
			c = this.source[this.index],
			nc = this.source[++this.index];
			
		// Treat \r\n as a single character
		if(c === '\r' && nc === '\n') {
			++this.index;
		}
		
		if(Character.isNewline(c)) {
			++this.line;
			this.col = 0;
		}
		else {
			++this.col;
		}
		
		switch(nc) {
			case '\r':
			case '\n':
				// All newlines are abstracted as \n
				this.lookahead = '\n';
				break;

			default:
				this.lookahead = nc;
		}

		return this.lookahead;
	}

	next(): string {
		if(this.lookahead) {
			return this.lookahead;
		}
		return this.consume();
	}

	getPosition(): Position {
		return {
			line: this.line,
			col: this.col,
			start: this.index,
			end: 0
		}
	}
	
	makeToken(type: Token, pos: Position, end?: number): RawToken {
		pos.end = end || this.index;
		return {
			type, pos, value: this.source.slice(
				pos.start, this.index
			)
		};
	}
	
	skipSpace() {
		while(Character.isWhiteSpace(this.next())) {
			this.consume();
		}
	}
	
	scanSpace(): RawToken|null {
		let start = this.getPosition();
		this.skipSpace();
		if(start.start == this.index) {
			return null;
		}
		else {
			return this.makeToken(Token.Whitespace, start);
		}
	}
	
	isOperator(id: string): boolean {
		return [
			"and", "or", "not",
			"is", "in",
		].indexOf(id) != -1;
	}

	isKeyword(id: string): boolean {
		return [
			"if", "else",
			"try", "fail",
			"while",
			"new", "del",
			"var", "let",
			"break", "continue",
			"return",
			"this"
		].indexOf(id) != -1;
	}

	scanIdentifier(): RawToken|null {
		let pos = this.getPosition();

		let ch = this.next();

		if(!Character.isIdentifierStart(ch)) {
			return null;
		}

		do {
			if(!Character.isIdentifierPart(this.consume())) {
				break;
			}
		} while(!this.eof());

		let
			id = this.source.slice(pos.start, this.index),
			type: Token;

		if(this.isOperator(id)) {
			type = Token.Punctuator;
		}
		else if(this.isKeyword(id)) {
			type = Token.Keyword;
		}
		else if(id === 'nil') {
			type = Token.NilLiteral;
		}
		else if(id === 'true' || id === 'false') {
			type = Token.BooleanLiteral;
		}
		else {
			type = Token.Identifier;
		}
		
		return this.makeToken(type, pos);
	}
	
	scanGroup(): RawToken|null {
		let pos = this.getPosition(), c = this.next();
		switch(c) {
			case "(":
			case "[":
			case "{":
				this.consume();
				return this.makeToken(Token.GroupOpen, pos);
			
			case ")":
			case "]":
			case "}":
				this.consume();
				return this.makeToken(Token.GroupClose, pos);
			
			default: return null;
		}
	}

	scanPunctuator1(str: string): string {
		switch(str[0]) {
			case "+": case "-":
			case "*": case "/": case "%":
			
			case "<": case ">":
			
			case '.': case ',':
			case "!": case "?":
			case ';': case ":":

			case "=":
				return str[0];
		}
		return "";
	}
	
	scanPunctuator2(str: string): string {
		let s = str.slice(0, 2);
		switch(s) {
			case '==':
			case '>=':
			case '<=':
			case '!=':
				return s;
		}
		
		return "";
	}

	scanPunctuator(): RawToken|null {
		let
			pos = this.getPosition(),
			str = this.source.substr(this.index, 3);
		
		if(this.scanPunctuator2(str)) {
			this.consume();
			this.consume();
		}
		else if(this.scanPunctuator1(str)) {
			this.consume();
		}
		else {
			return null;
		}
		
		// Reset lookahead so consume can recalculate
		this.lookahead = this.source[this.index];

		return this.makeToken(Token.Punctuator, pos);
	}

	scanDecimalLiteral(): RawToken|null {
		let num = '', pos = this.getPosition(), ch;

		while(!this.eof() && /\d/.test(ch = this.next())) {
			num += ch;
			this.consume();
		}
		
		if(this.index == pos.start) {
			return null;
		}
		else {
			return this.makeToken(Token.NumericLiteral, pos);
		}
	}

	scanNumericLiteral(): RawToken|null {
		return this.scanDecimalLiteral();
	}

	scanStringLiteral(): RawToken|null {
		let pos = this.getPosition();
		let quote = this.next();
		if(!Character.isQuote(quote)) {
			return null;
		}

		let str = '', ch = this.consume();
		
		while(ch != quote) {
			if(this.eof()) {
				throw this.scanError("EOF while parsing string");
			}
			
			if(ch === '\\') {
				ch = this.consume();
				if(Character.isNewline(ch)) {
					str += '\n';
				}
				else {
					str += ch;
				}
			}
			else if(Character.isNewline(ch)) {
				str += '\n';
			}
			else {
				str += ch;
			}
			
			ch = this.consume();
		}
		
		this.consume();
		
		return this.makeToken(Token.StringLiteral, pos);
	}

	public lex(): RawToken {
		if(this.eof()) {
			return {
				type: Token.EOF,
				value: ''
			};
		}

		let tok = (
			this.scanSpace() ||
			this.scanNumericLiteral() ||
			this.scanStringLiteral() ||
			this.scanIdentifier() ||
			this.scanGroup() ||
			this.scanPunctuator()
		);

		if(tok === null) {
			console.log(JSON.stringify(this.source.slice(this.index, this.index + 20)) + "...")
			throw this.scanError("Unknown token");
		}
		return tok;
	}
}
