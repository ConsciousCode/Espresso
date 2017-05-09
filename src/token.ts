export const enum Token {
	BooleanLiteral = 1,
	EOF,
	Identifier,
	Keyword,
	NullLiteral,
	NumericLiteral,
	Punctuator,
	StringLiteral
}

export let TokenName = {};
TokenName[Token.BooleanLiteral] = 'Boolean';
TokenName[Token.EOF] = '<end>';
TokenName[Token.Identifier] = 'Identifier';
TokenName[Token.Keyword] = 'Keyword';
TokenName[Token.NullLiteral] = 'Nil';
TokenName[Token.NumericLiteral] = 'Numeric';
TokenName[Token.Punctuator] = 'Punctuator';
TokenName[Token.StringLiteral] = 'String';
