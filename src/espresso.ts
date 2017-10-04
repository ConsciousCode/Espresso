/*
  Copyright JS Foundation and other contributors, https://js.foundation/

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import { Parser } from './parser';
import { Token } from './token';
import { Scanner } from './scanner';
import { Interpreter } from './interpret';
import { Transpiler } from './transpile';

export function parse(code: string) {
	return new Parser(code).parseScript();
}

export function exec(code: string) {
	return new Interpreter().exec(parse(code));
}

export function transpile(code: string) {
	return new Transpiler().generate(parse(code));
}

export function tokenStream(code: string) {
	const scanner = new Scanner(code);

	for(;;) {
		let tok = scanner.lex();
		if(tok.type === Token.EOF) {
			break;
		}
		
		console.log(tok);
	}
}

export function tokenize(code: string) {
	const scanner = new Scanner(code);

	let tokens: any = [];

	for(;;) {
		let tok = scanner.lex();
		if(tok.type === Token.EOF) {
			break;
		}
		
		tokens.push(tok);
	}
	
	return tokens;
}
