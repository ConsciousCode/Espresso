// See also tools/generate-unicode-regex.js.
const Regex = {
	// Unicode v8.0.0 NonAsciiIdentifierStart:
	NonAsciiIdentifierStart: /\D|[^\0-\x1f\x7f\u0080-\u009f \u0085\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f-\u2060\u3000\ufeff]|[^-+*\/%!@#^&()|={}\[\]<>.,]/,

	// Unicode v8.0.0 NonAsciiIdentifierPart:
	NonAsciiIdentifierPart: /[^\0-\x1f\x7f\u0080-\u009f \u0085\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f-\u2060\u3000\ufeff]|[^-+*\/%!@#^&()|={}\[\]<>.,]/
};

export const Character = {
	isWhiteSpace(c: string): boolean {
		return /\s/.test(c);
	},
	isNewline(c: string): boolean {
		return /[\r\n\u2028\u2029]/.test(c);
	},

	isIdentifierStart(c: string): boolean {
		return /[$_a-z]/i.test(c);
	},

	isIdentifierPart(c: string): boolean {
		return /[$_a-z\d]/i.test(c);
	},

	isDecimalDigit(c: string): boolean {
		return /[\d.]/.test(c);
	},
	isHexDigit(c: string): boolean {
		return /[a-f\d]/i.test(c);
	},
	isOctalDigit(c: string): boolean {
		return /[0-7]/.test(c);
	},
	isBinaryDigit(c: string): boolean {
		return /[01]/.test(c);
	},
	isBase(c: string, base: number): boolean {
		switch(base) {
			case 16: return this.isHexDigit(c);
			case 10: return this.isDecimalDigit(c);
			case 8: return this.isOctalDigit(c);
			case 2: return this.isBinaryDigit(c);
		}
		
		return false;
	},
	
	isGroupOpen(c: string): boolean {
		return /[([{]/.test(c);
	},
	isGroupClose(c: string): boolean {
		return /[)\]}]/.test(c);
	},
	isQuote(c: string): boolean {
		return /['"`]/.test(c);
	},

	toGroupOpen(c: string): string {
		return {
			")": "(",
			"]": "[",
			"}": "{"
		}[c]
	},
	toGroupClose(c: string): string {
		return {
			"(": ")",
			"[": "]",
			"{": "}"
		}[c]
	}
};
