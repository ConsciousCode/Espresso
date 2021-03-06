export const enum Token {
	EOF,
	
	Keyword,
	Punctuator,
	GroupOpen,
	GroupClose,
	
	NilLiteral,
	BooleanLiteral,
	NumericLiteral,
	StringLiteral,
	
	Identifier,
	
	Whitespace,
	SingleLineComment,
	MultiLineComment
}

export let TokenName = {};
TokenName[Token.EOF] = '<end>';

TokenName[Token.Keyword] = 'Keyword';
TokenName[Token.Punctuator] = 'Punctuator';
TokenName[Token.GroupOpen] = "GroupOpen";
TokenName[Token.GroupClose] = "GroupClose";

TokenName[Token.Identifier] = 'Identifier';

TokenName[Token.NilLiteral] = 'Nil';
TokenName[Token.BooleanLiteral] = 'Boolean';
TokenName[Token.NumericLiteral] = 'Numeric';
TokenName[Token.StringLiteral] = 'String';

TokenName[Token.Whitespace] = "Whitespace";
TokenName[Token.SingleLineComment] = "SingleLineComment";
TokenName[Token.MultiLineComment] = "MultiLineComment";
