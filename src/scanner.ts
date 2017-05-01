import { assert } from './assert';
import { Character } from './character';
import { ErrorHandler } from './error-handler';
import { Messages } from './messages';
import { Token } from './token';

function hexValue(ch: string): number {
    return '0123456789abcdef'.indexOf(ch.toLowerCase());
}

function octalValue(ch: string): number {
    return '01234567'.indexOf(ch);
}

export interface Position {
    line: number;
    column: number;
}

export interface SourceLocation {
    start: Position;
    end: Position;
    source?: string;
}

export interface Comment {
    multiLine: boolean;
    slice: number[];
    range: [number, number];
    loc: SourceLocation;
}

export interface RawToken {
    type: Token;
    value: string | number;
    pattern?: string;
    flags?: string;
    regex?: RegExp | null;
    octal?: boolean;
    cooked?: string;
    head?: boolean;
    tail?: boolean;
    lineNumber: number;
    lineStart: number;
    start: number;
    end: number;
}

interface ScannerState {
    index: number;
    lineNumber: number;
    lineStart: number;
}

export class Scanner {

    readonly source: string;
    readonly errorHandler: ErrorHandler;
    trackComment: boolean;

    index: number;
    lineNumber: number;
    lineStart: number;
    private curlyStack: string[];

    private readonly length: number;

    constructor(code: string, handler: ErrorHandler) {
        this.source = code;
        this.errorHandler = handler;
        this.trackComment = false;

        this.length = code.length;
        this.index = 0;
        this.lineNumber = (code.length > 0) ? 1 : 0;
        this.lineStart = 0;
        this.curlyStack = [];
    }

    public saveState(): ScannerState {
        return {
            index: this.index,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart
        };
    }

    public restoreState(state: ScannerState): void {
        this.index = state.index;
        this.lineNumber = state.lineNumber;
        this.lineStart = state.lineStart;
    }

    public eof(): boolean {
        return this.index >= this.length;
    }

    public throwUnexpectedToken(message = Messages.UnexpectedTokenIllegal): never {
        return this.errorHandler.throwError(this.index, this.lineNumber,
            this.index - this.lineStart + 1, message);
    }

    private tolerateUnexpectedToken(message = Messages.UnexpectedTokenIllegal) {
        this.errorHandler.tolerateError(this.index, this.lineNumber,
            this.index - this.lineStart + 1, message);
    }

    private scanLineTerminator(ch) {
        // 0x0D is \r, 0x0a is \n
        if (ch === 0x0D && this.source.charCodeAt(this.index + 1) === 0x0A) {
            ++this.index;
        }
        ++this.lineNumber;
        ++this.index;
        this.lineStart = this.index;
    }

    // https://tc39.github.io/ecma262/#sec-comments

    private skipSingleLineComment(offset: number): Comment[] {
        let comments: Comment[] = [];
        let start, loc;

        if (this.trackComment) {
            comments = [];
            start = this.index - offset;
            loc = {
                start: {
                    line: this.lineNumber,
                    column: this.index - this.lineStart - offset
                },
                end: {}
            };
        }

        while (!this.eof()) {
            const ch = this.source.charCodeAt(this.index);
            ++this.index;
            if (Character.isLineTerminator(ch)) {
                if (this.trackComment) {
                    loc.end = {
                        line: this.lineNumber,
                        column: this.index - this.lineStart - 1
                    };
                    const entry: Comment = {
                        multiLine: false,
                        slice: [start + offset, this.index - 1],
                        range: [start, this.index - 1],
                        loc: loc
                    };
                    comments.push(entry);
                }
                if (ch === 13 && this.source.charCodeAt(this.index) === 10) {
                    ++this.index;
                }
                ++this.lineNumber;
                this.lineStart = this.index;
                return comments;
            }
        }

        if (this.trackComment) {
            loc.end = {
                line: this.lineNumber,
                column: this.index - this.lineStart
            };
            const entry: Comment = {
                multiLine: false,
                slice: [start + offset, this.index],
                range: [start, this.index],
                loc: loc
            };
            comments.push(entry);
        }

        return comments;
    }

    private skipMultiLineComment(hier: number[]): Comment[] {
        let comments: Comment[] = [];
        let start, loc;

        if (this.trackComment) {
            comments = [];
            start = this.index - 2;
            loc = {
                start: {
                    line: this.lineNumber,
                    column: this.index - this.lineStart - 2
                },
                end: {}
            };
        }

        while (!this.eof()) {
            let ch = this.source.charCodeAt(this.index);
            if (Character.isLineTerminator(ch)) {
                this.scanLineTerminator(ch);
                // 0x23 is #, process inner comment
            } else if (ch === 0x23) {
                this.skipComment(
                    hier, this.source.charCodeAt(this.index + 1)
                );
            } else if (ch === hier[hier.length - 1]) {
                // Block comment ends with '<close>#'.
                // 0x23 is #
                if (this.source.charCodeAt(this.index + 1) === 0x23) {
                    this.index += 2;
                    if (this.trackComment) {
                        loc.end = {
                            line: this.lineNumber,
                            column: this.index - this.lineStart
                        };
                        const entry: Comment = {
                            multiLine: true,
                            slice: [start + 2, this.index - 2],
                            range: [start, this.index],
                            loc: loc
                        };
                        comments.push(entry);
                    }
                    return comments;
                }
                ++this.index;
            } else {
                ++this.index;
            }
        }

        // Ran off the end of the file - the whole thing is a comment
        if (this.trackComment) {
            loc.end = {
                line: this.lineNumber,
                column: this.index - this.lineStart
            };
            const entry: Comment = {
                multiLine: true,
                slice: [start + 2, this.index],
                range: [start, this.index],
                loc: loc
            };
            comments.push(entry);
        }

        this.tolerateUnexpectedToken();
        return comments;
    }

    public skipComment(hier, ch) {
        let comment;
        switch (ch) {
            case 0x28: // (
                this.index += 2;
                hier.push(0x29);
                comment = this.skipMultiLineComment(hier);
                break;
            case 0x5b: // [
                this.index += 2;
                hier.push(0x5d);
                comment = this.skipMultiLineComment(hier);
                break;
            case 0x7b: // {
                this.index += 2;
                hier.push(0x7d);
                comment = this.skipMultiLineComment(hier);
                break;
            default:
                this.index += 1;
                return this.skipSingleLineComment(1);
        }

        hier.pop();

        return comment;
    }

    public scanComments() {
        let comments;
        if (this.trackComment) {
            comments = [];
        }

        while (!this.eof()) {
            let ch = this.source.charCodeAt(this.index);

            if (Character.isWhiteSpace(ch)) {
                ++this.index;
            } else if (Character.isLineTerminator(ch)) {
                ++this.index;
                if (ch === 0x0D && this.source.charCodeAt(this.index) === 0x0A) {
                    ++this.index;
                }
                ++this.lineNumber;
                this.lineStart = this.index;
            } else if (ch === 0x23) { // U+0023 is '#'
                ch = this.source.charCodeAt(this.index + 1);
                const comment = this.skipComment([], ch);

                if (this.trackComment) {
                    comments = comments.concat(comment);
                }
            } else {
                break;
            }
        }

        return comments;
    }

    // https://tc39.github.io/ecma262/#sec-future-reserved-words

    public isFutureReservedWord(id: string): boolean {
        switch (id) {
            case 'enum':
            case 'export':
            case 'import':
            case 'super':
                return true;
            default:
                return false;
        }
    }

    // https://tc39.github.io/ecma262/#sec-keywords

    private isKeyword(id: string): boolean {
        switch (id.length) {
            case 2:
                return (id === 'if') || (id === 'in') || (id === 'do');
            case 3:
                return (id === 'var') || (id === 'for') || (id === 'new') ||
                    (id === 'try') || (id === 'let');
            case 4:
                return (id === 'this') || (id === 'else') || (id === 'case') ||
                    (id === 'void') || (id === 'with') || (id === 'enum');
            case 5:
                return (id === 'while') || (id === 'break') || (id === 'catch') ||
                    (id === 'throw') || (id === 'const') || (id === 'yield') ||
                    (id === 'class') || (id === 'super');
            case 6:
                return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
                    (id === 'switch') || (id === 'export') || (id === 'import');
            case 7:
                return (id === 'default') || (id === 'finally') || (id === 'extends');
            case 8:
                return (id === 'function') || (id === 'continue') || (id === 'debugger');
            case 10:
                return (id === 'instanceof');
            default:
                return false;
        }
    }

    private codePointAt(i: number): number {
        let cp = this.source.charCodeAt(i);

        if (cp >= 0xD800 && cp <= 0xDBFF) {
            const second = this.source.charCodeAt(i + 1);
            if (second >= 0xDC00 && second <= 0xDFFF) {
                const first = cp;
                cp = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
            }
        }

        return cp;
    }

    private scanHexEscape(prefix: string): string | null {
        const len = (prefix === 'u') ? 4 : 2;
        let code = 0;

        for (let i = 0; i < len; ++i) {
            if (!this.eof() && Character.isHexDigit(this.source.charCodeAt(this.index))) {
                code = code * 16 + hexValue(this.source[this.index++]);
            } else {
                return null;
            }
        }
        return String.fromCharCode(code);
    }

    private scanUnicodeCodePointEscape(): string {
        let ch = this.source[this.index];
        let code = 0;

        // At least, one hex digit is required.
        if (ch === '}') {
            this.throwUnexpectedToken();
        }

        while (!this.eof()) {
            ch = this.source[this.index++];
            if (!Character.isHexDigit(ch.charCodeAt(0))) {
                break;
            }
            code = code * 16 + hexValue(ch);
        }

        if (code > 0x10FFFF || ch !== '}') {
            this.throwUnexpectedToken();
        }

        return Character.fromCodePoint(code);
    }

    private getIdentifier(): string {
        const start = this.index++;
        while (!this.eof()) {
            const ch = this.source.charCodeAt(this.index);
            if (ch === 0x5C) {
                // Blackslash (U+005C) marks Unicode escape sequence.
                this.index = start;
                return this.getComplexIdentifier();
            } else if (ch >= 0xD800 && ch < 0xDFFF) {
                // Need to handle surrogate pairs.
                this.index = start;
                return this.getComplexIdentifier();
            }
            if (Character.isIdentifierPart(ch)) {
                ++this.index;
            } else {
                break;
            }
        }

        return this.source.slice(start, this.index);
    }

    private getComplexIdentifier(): string {
        let cp = this.codePointAt(this.index);
        let id = Character.fromCodePoint(cp);
        this.index += id.length;

        // '\u' (U+005C, U+0075) denotes an escaped character.
        let ch;
        if (cp === 0x5C) {
            if (this.source.charCodeAt(this.index) !== 0x75) {
                this.throwUnexpectedToken();
            }
            ++this.index;
            if (this.source[this.index] === '{') {
                ++this.index;
                ch = this.scanUnicodeCodePointEscape();
            } else {
                ch = this.scanHexEscape('u');
                if (ch === null || ch === '\\' || !Character.isIdentifierStart(ch.charCodeAt(0))) {
                    this.throwUnexpectedToken();
                }
            }
            id = ch;
        }

        while (!this.eof()) {
            cp = this.codePointAt(this.index);
            if (!Character.isIdentifierPart(cp)) {
                break;
            }
            ch = Character.fromCodePoint(cp);
            id += ch;
            this.index += ch.length;

            // '\u' (U+005C, U+0075) denotes an escaped character.
            if (cp === 0x5C) {
                id = id.substr(0, id.length - 1);
                if (this.source.charCodeAt(this.index) !== 0x75) {
                    this.throwUnexpectedToken();
                }
                ++this.index;
                if (this.source[this.index] === '{') {
                    ++this.index;
                    ch = this.scanUnicodeCodePointEscape();
                } else {
                    ch = this.scanHexEscape('u');
                    if (ch === null || ch === '\\' || !Character.isIdentifierPart(ch.charCodeAt(0))) {
                        this.throwUnexpectedToken();
                    }
                }
                id += ch;
            }
        }

        return id;
    }

    // https://tc39.github.io/ecma262/#sec-names-and-keywords

    private scanIdentifier(): RawToken {
        let type: Token;
        const start = this.index;

        // Backslash (U+005C) starts an escaped character.
        const id = (this.source.charCodeAt(start) === 0x5C) ? this.getComplexIdentifier() : this.getIdentifier();

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            type = Token.Identifier;
        } else if (this.isKeyword(id)) {
            type = Token.Keyword;
        } else if (id === 'nil') {
            type = Token.NullLiteral;
        } else if (id === 'true' || id === 'false') {
            type = Token.BooleanLiteral;
        } else {
            type = Token.Identifier;
        }

        if (type !== Token.Identifier && (start + id.length !== this.index)) {
            const restore = this.index;
            this.index = start;
            this.tolerateUnexpectedToken(Messages.InvalidEscapedReservedWord);
            this.index = restore;
        }

        return {
            type: type,
            value: id,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }

    // https://tc39.github.io/ecma262/#sec-punctuators

    private scanPunctuator(): RawToken {
        const start = this.index;

        // Check for most common single-character punctuators.
        let str = this.source[this.index];
        switch (str) {

            case '(':
            case '{':
                if (str === '{') {
                    this.curlyStack.push('{');
                }
                ++this.index;
                break;

            case '.':
                ++this.index;
                if (this.source[this.index] === '.' && this.source[this.index + 1] === '.') {
                    // Spread operator: ...
                    this.index += 2;
                    str = '...';
                }
                break;

            case '}':
                ++this.index;
                this.curlyStack.pop();
                break;
            case ')':
            case ';':
            case ',':
            case '[':
            case ']':
            case ':':
            case '?':
            case '~':
                ++this.index;
                break;

            default:
                // 4-character punctuator.
                str = this.source.substr(this.index, 4);
                if (str === '>>>=') {
                    this.index += 4;
                } else {

                    // 3-character punctuators.
                    str = str.substr(0, 3);
                    if (str === '>>>' ||
                        str === '<<=' || str === '>>=' || str === '**=') {
                        this.index += 3;
                    } else {

                        // 2-character punctuators.
                        str = str.substr(0, 2);
                        if (str === '&&' || str === '||' || str === '==' || str === '!=' ||
                            str === '+=' || str === '-=' || str === '*=' || str === '/=' ||
                            str === '++' || str === '--' || str === '<<' || str === '>>' ||
                            str === '&=' || str === '|=' || str === '^=' || str === '%=' ||
                            str === '<=' || str === '>=' || str === '=>' || str === '**') {
                            this.index += 2;
                        } else {

                            // 1-character punctuators.
                            str = this.source[this.index];
                            if ('<>=!+-*%&|^/'.indexOf(str) >= 0) {
                                ++this.index;
                            }
                        }
                    }
                }
        }

        if (this.index === start) {
            this.throwUnexpectedToken();
        }

        return {
            type: Token.Punctuator,
            value: str,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }

    /**
     * Scan spaces in literal tokens and return true if something
     *  was skipped.
    **/
    private scanLiteralSpace(ch: number) {
        if (!Character.isWhiteSpace(ch)) {
            return false;
        }

        do {
            if (Character.isLineTerminator(ch)) {
                this.scanLineTerminator(ch);
            }
            else {
                ++this.index;
            }

            ch = this.source.charCodeAt(this.index);
        } while (Character.isWhiteSpace(ch));

        return true;
    }

    // https://tc39.github.io/ecma262/#sec-literals-numeric-literals

    private scanHexLiteral(start: number): RawToken {
        let num = '';

        while (!this.eof()) {
            let ch = this.source.charCodeAt(this.index);

            if (this.scanLiteralSpace(ch)) {
                continue;
            }
            else if (!Character.isHexDigit(this.source.charCodeAt(this.index))) {
                break;
            }

            num += this.source[this.index++];
        }

        if (num.length === 0) {
            this.throwUnexpectedToken();
        }

        if (Character.isIdentifierStart(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt('0x' + num, 16),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }

    private scanBinaryLiteral(start: number): RawToken {
        let num = '';
        let ch;

        while (!this.eof()) {
            ch = this.source.charCodeAt(this.index);

            if (this.scanLiteralSpace(ch)) {
                continue;
            }
            // 0x30 == '0', 0x31 == '1'
            else if (ch !== 0x30 && ch !== 0x31) {
                break;
            }

            num += this.source[this.index++];
        }

        if (num.length === 0) {
            // only 0b or 0B
            this.throwUnexpectedToken();
        }

        if (!this.eof()) {
            ch = this.source.charCodeAt(this.index);
            /* istanbul ignore else */
            if (Character.isIdentifierStart(ch) || Character.isDecimalDigit(ch)) {
                this.throwUnexpectedToken();
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt(num, 2),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }

    private scanOctalLiteral(prefix: string, start: number): RawToken {
        let num = '';
        let octal = false;

        if (Character.isOctalDigit(prefix.charCodeAt(0))) {
            octal = true;
            num = '0' + this.source[this.index++];
        } else {
            ++this.index;
        }

        while (!this.eof()) {
            let ch = this.source.charCodeAt(this.index);
            if (this.scanLiteralSpace(ch)) {
                continue;
            }
            else if (!Character.isOctalDigit(ch)) {
                break;
            }

            num += this.source[this.index++];
        }

        if (!octal && num.length === 0) {
            // only 0o or 0O
            this.throwUnexpectedToken();
        }

        if (Character.isIdentifierStart(this.source.charCodeAt(this.index)) || Character.isDecimalDigit(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt(num, 8),
            octal: octal,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }

    private scanNumericLiteral(): RawToken {
        const start = this.index;
        let ch = this.source[start];
        assert(Character.isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        let num = '';
        if (ch !== '.') {
            num = this.source[this.index++];

            // Hex number starts with '0x'.
            // Octal number in ES6 starts with '0o'.
            // Binary number in ES6 starts with '0b'.
            if (num === '0') {
                this.scanLiteralSpace(
                    this.source.charCodeAt(this.index)
                );
                ch = this.source[this.index];
                if (ch === 'x' || ch === 'X') {
                    ++this.index;
                    return this.scanHexLiteral(start);
                }
                if (ch === 'b' || ch === 'B') {
                    ++this.index;
                    return this.scanBinaryLiteral(start);
                }
                if (ch === 'o' || ch === 'O') {
                    return this.scanOctalLiteral(ch, start);
                }
            }

            while (!this.eof()) {
                let cc = this.source.charCodeAt(this.index);
                if (this.scanLiteralSpace(cc)) {
                    continue;
                }
                else if (!Character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                    break;
                }

                num += this.source[this.index++];
            }
            ch = this.source[this.index];
        }

        if (ch === '.') {
            num += this.source[this.index++];
            while (Character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                num += this.source[this.index++];
            }
            ch = this.source[this.index];
        }

        if (ch === 'e' || ch === 'E') {
            num += this.source[this.index++];

            ch = this.source[this.index];
            if (ch === '+' || ch === '-') {
                num += this.source[this.index++];
            }
            if (Character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                while (Character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                    num += this.source[this.index++];
                }
            } else {
                this.throwUnexpectedToken();
            }
        }

        if (Character.isIdentifierStart(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(num),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }

    // https://tc39.github.io/ecma262/#sec-literals-string-literals

    private scanStringLiteral(): RawToken {
        const start = this.index;
        let quote = this.source[start];
        assert((quote === '\'' || quote === '"' || quote === '`'),
            'String literal must starts with a quote');

        ++this.index;
        let octal = false;
        let str = '';

        while (!this.eof()) {
            let ch = this.source[this.index++];

            if (ch === quote) {
                this.scanLiteralSpace(
                    this.source.charCodeAt(this.index)
                );
                ch = this.source[this.index++];

                // Concatenate adjacent string literals
                // TODO: Enable comments between them
                if (ch === "'" || ch === '"' || ch === '`') {
                    quote = ch;
                    continue;
                }
                else {
                    quote = '';
                    break;
                }
            } else if (ch === '\\') {
                ch = this.source[this.index++];
                if (!ch || !Character.isLineTerminator(ch.charCodeAt(0))) {
                    switch (ch) {
                        case 'u':
                            if (this.source[this.index] === '{') {
                                ++this.index;
                                str += this.scanUnicodeCodePointEscape();
                            } else {
                                const unescaped = this.scanHexEscape(ch);
                                if (unescaped === null) {
                                    this.throwUnexpectedToken();
                                }
                                str += unescaped;
                            }
                            break;
                        case 'x':
                            const unescaped = this.scanHexEscape(ch);
                            if (unescaped === null) {
                                this.throwUnexpectedToken(Messages.InvalidHexEscapeSequence);
                            }
                            str += unescaped;
                            break;
                        case 'a':
                        case "G":
                            str += '\x07';
                            break;
                        case 'e':
                        case '[':
                            str += '\x1b';
                            break;
                        case 'n':
                        case "J":
                            str += '\n';
                            break;
                        case 'r':
                        case "M":
                            str += '\r';
                            break;
                        case 't':
                        case "I":
                            str += '\t';
                            break;
                        case 'b':
                        case "H":
                            str += '\b';
                            break;
                        case 'f':
                        case "L":
                            str += '\f';
                            break;
                        case 'v':
                        case "K":
                            str += '\x0B';
                            break;
                        case '8':
                        case '9':
                            str += ch;
                            this.tolerateUnexpectedToken();
                            break;

                        // Extra escapes not normally included
                        case "@": // NUL
                            str += '\x00';
                            break;
                        case "A": // SOH
                            str += '\x01';
                            break;
                        case "B": // STX
                            str += '\x02';
                            break;
                        case "C": // ETX
                            str += '\x03';
                            break;
                        case "D": // EOT
                            str += '\x04';
                            break;
                        case "E": // ENQ
                            str += '\x05';
                            break;
                        case "F": // ACK
                            str += '\x06';
                            break;
                        // G, H, I, J, K, L, M handled above
                        case "N": // Shift Out
                            str += '\x0e';
                            break;
                        case "O": // Shift In
                            str += '\x0f';
                            break;
                        case "P": // DLE
                            str += '\x10'
                            break;
                        case "Q": // DC1
                            str += '\x11';
                            break;
                        case "R": // DC2
                            str += '\x12';
                            break;
                        case "S": // DC3
                            str += '\x13';
                            break;
                        case "T": // DC4
                            str += '\x14';
                            break;
                        case "U": // NAK
                            str += '\x15';
                            break;
                        case "V": // SYN
                            str += '\x16';
                            break;
                        case "W": // ETB
                            str += '\x17';
                            break;
                        case "X": // CAN
                            str += '\x18';
                            break;
                        case "Y": // End of Medium
                            str += '\x19';
                            break;
                        case "Z": // SUB
                            str += '\x1a';
                            break;
                        // Got [
                        case '|': // File Separator
                            // Traditionally this is ^\, which would
                            //  translate to \\, but that's taken
                            str += '\x1c';
                            break;
                        case ']': // Group Separator
                            str += '\x1d';
                            break;
                        case "^": // Record Separator
                            str += '\x1e';
                            break;
                        case "_": // Unit Separator
                            str += '\x1f';
                            break;
                        case "?":
                            str += '\x7f';
                            break;

                        default:
                            str += ch;
                            break;
                    }
                } else {
                    ++this.lineNumber;
                    if (ch === '\r' && this.source[this.index] === '\n') {
                        ++this.index;
                    }
                    this.lineStart = this.index;
                }
            } else if (Character.isLineTerminator(ch.charCodeAt(0))) {
                str += '\n';
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            this.index = start;
            this.throwUnexpectedToken();
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    } 33

    public lex(): RawToken {
        if (this.eof()) {
            return {
                type: Token.EOF,
                value: '',
                lineNumber: this.lineNumber,
                lineStart: this.lineStart,
                start: this.index,
                end: this.index
            };
        }

        const cp = this.source.charCodeAt(this.index);

        if (Character.isIdentifierStart(cp)) {
            return this.scanIdentifier();
        }

        // Very common: ( and ) and ;
        if (cp === 0x28 || cp === 0x29 || cp === 0x3B) {
            return this.scanPunctuator();
        }

        // String literal starts with single quote (U+0027) or double quote (U+0022) or a backtick (U+0060)
        if (cp === 0x27 || cp === 0x22 || cp === 0x60) {
            return this.scanStringLiteral();
        }

        // Dot (.) U+002E can also start a floating-point number, hence the need
        // to check the next character.
        if (cp === 0x2E) {
            if (Character.isDecimalDigit(this.source.charCodeAt(this.index + 1))) {
                return this.scanNumericLiteral();
            }
            return this.scanPunctuator();
        }

        if (Character.isDecimalDigit(cp)) {
            return this.scanNumericLiteral();
        }

        // Possible identifier start in a surrogate pair.
        if (cp >= 0xD800 && cp < 0xDFFF) {
            if (Character.isIdentifierStart(this.codePointAt(this.index))) {
                return this.scanIdentifier();
            }
        }

        return this.scanPunctuator();
    }

}
