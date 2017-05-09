// See also tools/generate-unicode-regex.js.
const Regex = {
    // Unicode v8.0.0 NonAsciiIdentifierStart:
    NonAsciiIdentifierStart: /\D|[^\0-\x1f\x7f\u0080-\u009f \u0085\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f-\u2060\u3000\ufeff]|[^-+*\/%!@#^&()|={}\[\]<>.,]/,

    // Unicode v8.0.0 NonAsciiIdentifierPart:
    NonAsciiIdentifierPart: /[^\0-\x1f\x7f\u0080-\u009f \u0085\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f-\u2060\u3000\ufeff]|[^-+*\/%!@#^&()|={}\[\]<>.,]/
};

export const Character = {

    /* tslint:disable:no-bitwise */

    fromCodePoint(cp: number): string {
        return (cp < 0x10000) ? String.fromCharCode(cp) :
            String.fromCharCode(0xD800 + ((cp - 0x10000) >> 10)) +
            String.fromCharCode(0xDC00 + ((cp - 0x10000) & 1023));
    },

    // https://tc39.github.io/ecma262/#sec-white-space

    isWhiteSpace(cp: number): boolean {
    	return [
			0x20, 0x09, 0x0B, 0x0C, 0xA0,
	
			0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
			0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F,
			0x3000, 0xFEFF
		].indexOf(cp) != -1;
    },

    // https://tc39.github.io/ecma262/#sec-line-terminators

    isLineTerminator(cp: number): boolean {
        return (cp === 0x0A) || (cp === 0x0D) || (cp === 0x2028) || (cp === 0x2029);
    },

    // https://tc39.github.io/ecma262/#sec-names-and-keywords

    isIdentifierStart(cp: number): boolean {
        return (cp === 0x24) || (cp === 0x5F) ||  // $ (dollar) and _ (underscore)
            (cp >= 0x41 && cp <= 0x5A) ||         // A..Z
            (cp >= 0x61 && cp <= 0x7A) ||         // a..z
            (cp === 0x5C) ||                      // \ (backslash)
            ((cp >= 0x80) && Regex.NonAsciiIdentifierStart.test(Character.fromCodePoint(cp)));
    },

    isIdentifierPart(cp: number): boolean {
        return (cp === 0x24) || (cp === 0x5F) ||  // $ (dollar) and _ (underscore)
            (cp >= 0x41 && cp <= 0x5A) ||         // A..Z
            (cp >= 0x61 && cp <= 0x7A) ||         // a..z
            (cp >= 0x30 && cp <= 0x39) ||         // 0..9
            (cp === 0x5C) ||                      // \ (backslash)
            ((cp >= 0x80) && Regex.NonAsciiIdentifierPart.test(Character.fromCodePoint(cp)));
    },

    // https://tc39.github.io/ecma262/#sec-literals-numeric-literals

    isDecimalDigit(cp: number): boolean {
        return (cp >= 0x30 && cp <= 0x39);      // 0..9
    },

    isHexDigit(cp: number): boolean {
        return (cp >= 0x30 && cp <= 0x39) ||    // 0..9
            (cp >= 0x41 && cp <= 0x46) ||       // A..F
            (cp >= 0x61 && cp <= 0x66);         // a..f
    },

    isOctalDigit(cp: number): boolean {
        return (cp >= 0x30 && cp <= 0x37);      // 0..7
    }

};
