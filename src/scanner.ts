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
	value: string | number;

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

	consume(): string {
		let c = this.source[++this.index];
		switch(c) {
			case '\r':
				if(this.source[this.index] == '\n') {
					++this.index;
				}
			case '\n':
				++this.line;
				this.col = 0;
				this.lookahead = '\n';
				break;

			default:
				this.lookahead = c;
				++this.col;
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

	skipSingleLineComment() {
		while(!this.eof() && this.consume() != '\n') { }
	}

	skipMultiLineComment(type: string) {
		let end = Character.toGroupClose(type);
		while(!this.eof()) {
			let ch = this.consume();
			if(ch === "#") {
				ch = this.consume();
				if(Character.isGroupOpen(ch)) {
					this.skipMultiLineComment(ch);
				}
			}
			else if(ch === end) {
				// Block comment ends with '<close>#''
				if(this.consume() == "#") {
					break;
				}
			}
		}
	}

	public scanComments(): boolean {
		let present = false;
		while(!this.eof()) {
			let ch = this.next();

			if(ch === "#") {
				ch = this.consume();
				if(Character.isGroupOpen(ch)) {
					this.skipMultiLineComment(ch);
				}
				else {
					this.skipSingleLineComment();
				}
			}
			else if(!Character.isWhiteSpace(ch)) {
				break;
			}

			present = true;
		}

		return present;
	}

	scanGroup(): RawToken | null {
		let ch = this.next(), pos = this.getPosition();
		let type: Token;
		if(Character.isGroupOpen(ch)) {
			type = Token.GroupOpen;
		}
		else if(Character.isGroupClose(ch)) {
			type = Token.GroupClose;
		}
		else {
			return null;
		}

		this.consume();

		return {
			type: type,
			value: ch,
			pos: pos
		};
	}

	isKeyword(id: string): boolean {
		return [
			"if", "else",
			"try", "fail",
			"for", "while",
			"do", "with",
			"new", "del",
			"import", "export",
			"proto", "enum",
			"var", "def",
			"let", "use",
			"and", "or", "not",
			"is", "in",
			"as",
			"case", "when",
			"break", "continue", "redo",
			"return", "yield",
			"this", "super",
			"true", "false", "nil"
		].indexOf(id) != -1;
	}

	scanHexEscape(len: number): string | null {
		let code = 0, ch = this.next();

		for(let i = 0; i < len; ++i) {
			if(!this.eof() && Character.isHexDigit(this.consume())) {
				code = code * 16 + hexValue(ch);
				ch = this.consume();
			}
			else {
				return null;
			}
		}
		return String.fromCharCode(code);
	}

	scanIdentifier(): RawToken | null {
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

		if(this.isKeyword(id)) {
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

		pos.end = this.index;

		return {
			type: type,
			value: id,
			pos: pos
		};
	}

	scanPunctuator3(str: string): string {
		switch(str) {
			case ">>>":
			case "!!!":
			case "...":
				return str;
			
			default: return "";
		}
	}

	scanPunctuator2(str: string): string {
		str = str.substr(0, 2);

		switch(str) {
			case "++": case "--":
			
			case "**": case "//": case "%%":
			
			case "==": case "!=":
			case "<=": case ">=":
			case "&&": case "||":
			
			case "&&": case "||":
			case "<<": case ">>":
			
			case "|>":
				return str;
		}

		return "";
	}

	scanPunctuator1(str: string): string {
		switch(str[0]) {
			case "+": case "-":
			case "*": case "/": case "%":
			
			case "<": case ">":
			
			case '.': case ',':
			case "!": case "?":
			case ';': case ":":

			case "@":
			case "&": case "|":
			case "~": case "^":

			case "=": case "$":
				return str[0];
		}
		return "";
	}

	scanPunctuator(): RawToken | null {
		let
			pos = this.getPosition(),
			str = this.source.substr(this.index, 3),
			pun = "";

		if(pun = this.scanPunctuator3(str)) {
			this.index += 3;
			this.col += 3;
		}
		else if(pun = this.scanPunctuator2(str)) {
			this.index += 2;
			this.col += 2;
		}
		else if(pun = this.scanPunctuator1(str)) {
			++this.index;
			++this.col;
		}
		else {
			return null;
		}
		
		// Reset lookahead so consume can recalculate
		this.lookahead = this.source[this.index];

		return {
			type: Token.Punctuator,
			value: pun,
			pos: pos
		};
	}

	scanBase(ch: string, base: number): RawToken | null {
		let num = '';

		if(this.next().toLowerCase() != ch) {
			return null;
		}

		do {
			let ch = this.consume();

			if(this.scanComments()) {
				continue;
			}
			else if(Character.isBase(ch, base)) {
				num += ch;
			}
			else {
				break;
			}

		} while(!this.eof());

		if(num.length === 0) {
			throw this.scanError("No number follows 0" + ch);
		}

		return {
			type: Token.NumericLiteral,
			value: parseInt(num, base)
		};
	}

	scanDecimalLiteral(ch: string): RawToken {
		let num = '', dot = false, pos = this.getPosition();

		while(!this.eof() && Character.isDecimalDigit(ch)) {
			if(ch == '.') {
				if(dot) break;
				dot = true;
			}

			num += ch;
			ch = this.consume();
		}

		pos.end = this.index;

		return {
			type: Token.NumericLiteral,
			value: parseFloat(num),
			pos: pos
		};
	}

	scanNumericLiteral(): RawToken | null {
		let ch = this.next();
		if(!Character.isDecimalDigit(ch)) {
			return null;
		}

		if(ch === '0') {
			let pos = this.getPosition();

			this.consume();

			let tok =
				this.scanBase('x', 16) ||
				this.scanBase('o', 8) ||
				this.scanBase('b', 2);
			if(tok) {
				tok.pos = pos;
				return tok;
			}
		}

		return this.scanDecimalLiteral(ch);
	}

	scanStringLiteral(): RawToken | null {
		let pos = this.getPosition();
		let quote = this.next();
		if(!Character.isQuote(quote)) {
			return null;
		}

		let str = '';

		while(!this.eof()) {
			let ch = this.consume();

			if(ch === '\\') {
				ch = this.consume();
				if(ch === 'x') {
					let x = this.scanHexEscape(2);
					if(x) {
						str += x;
					}
					else {
						break;
					}
				}
				else if(Character.isNewline(ch)) {
					str += '\n';
				}
				else {
					str += {
						'a': '\x07',
						'n': '\n',
						'r': '\r',
						't': '\t',
						'f': '\f',
						'v': '\v'
					}[ch] || ch;
				}
			}
			else if(Character.isNewline(ch)) {
				str += '\n';
			}
			else {
				str += ch;
			}
		}
		
		if(this.eof()) {
			throw this.scanError("EOF while parsing string");
		}

		pos.end = this.index;

		return {
			type: Token.StringLiteral,
			value: str,
			pos: pos
		};
	}

	public lex(): RawToken {
		if(this.eof()) {
			return {
				type: Token.EOF,
				value: ''
			};
		}

		this.scanComments();

		let tok = (
			this.scanIdentifier() ||
			this.scanGroup() ||
			this.scanStringLiteral() ||
			this.scanNumericLiteral() ||
			this.scanPunctuator()
		);

		if(tok === null) {
			throw this.scanError("Unknown token");
		}
		return tok;
	}
}
