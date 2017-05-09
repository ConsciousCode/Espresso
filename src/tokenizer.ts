import { ErrorHandler } from './error-handler';
import { Comment, Scanner, SourceLocation } from './scanner';
import { Token, TokenName } from './token';

type ReaderEntry = string | null;

interface BufferEntry {
    type: string;
    value: string;
    range?: [number, number];
    loc?: SourceLocation;
}

class Reader {
    readonly values: ReaderEntry[];
    curly: number;
    paren: number;

    constructor() {
        this.values = [];
        this.curly = this.paren = -1;
    }

    // A function following one of those tokens is an expression.
    beforeFunctionExpression(t: string): boolean {
        return ['(', '{', '[', 'in', 'instanceof', 'new',
            'return', 'case', 'delete', 'throw',
            // assignment operators
            '=', '+=', '-=', '*=', '**=', '/=', '%=', '<<=', '>>=', '>>>=',
            '&=', '|=', '^=', ',',
            // binary/unary operators
            '+', '-', '*', '**', '/', '%', '++', '--', '<<', '>>', '>>>', '&',
            '|', '^', '!', '~', '&&', '||', '?', ':', '===', '==', '>=',
            '<=', '<', '>', '!=', '!=='].indexOf(t) >= 0;
    }

    push(token): void {
        if (token.type === Token.Punctuator || token.type === Token.Keyword) {
            if (token.value === '{') {
                this.curly = this.values.length;
            } else if (token.value === '(') {
                this.paren = this.values.length;
            }
            this.values.push(token.value);
        } else {
            this.values.push(null);
        }
    }

}

/* tslint:disable:max-classes-per-file */

interface Config {
    tolerant?: boolean;
    comment?: boolean;
    range?: boolean;
    loc?: boolean;
}

export class Tokenizer {
    readonly errorHandler: ErrorHandler;
    scanner: Scanner;
    readonly trackRange: boolean;
    readonly trackLoc: boolean;
    readonly buffer: BufferEntry[];
    readonly reader: Reader;

    constructor(code: string, config: Config) {
        this.errorHandler = new ErrorHandler();
        this.errorHandler.tolerant = config ? (typeof config.tolerant === 'boolean' && config.tolerant) : false;

        this.scanner = new Scanner(code, this.errorHandler);
        this.scanner.trackComment = config ? (typeof config.comment === 'boolean' && config.comment) : false;

        this.trackRange = config ? (typeof config.range === 'boolean' && config.range) : false;
        this.trackLoc = config ? (typeof config.loc === 'boolean' && config.loc) : false;
        this.buffer = [];
        this.reader = new Reader();
    }

    errors() {
        return this.errorHandler.errors;
    }

    getNextToken() {
        if (this.buffer.length === 0) {
            this.scanner.scanComments();

            if (!this.scanner.eof()) {
                let loc;

                if (this.trackLoc) {
                    loc = {
                        start: {
                            line: this.scanner.lineNumber,
                            column: this.scanner.index - this.scanner.lineStart
                        },
                        end: {}
                    };
                }

                const token = this.scanner.lex();
                this.reader.push(token);

                const entry: BufferEntry = {
                    type: TokenName[token.type],
                    value: this.scanner.source.slice(token.start, token.end)
                };
                if (this.trackRange) {
                    entry.range = [token.start, token.end];
                }
                if (this.trackLoc) {
                    loc.end = {
                        line: this.scanner.lineNumber,
                        column: this.scanner.index - this.scanner.lineStart
                    };
                    entry.loc = loc;
                }

                this.buffer.push(entry);
            }
        }

        return this.buffer.shift();
    }

}
