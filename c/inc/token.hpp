/**
 * The main header for tokenization.
**/
#ifndef ESPRESSO_TOKEN_HPP
#define ESPRESSO_TOKEN_HPP

#include "common.hpp"

namespace esp {

enum TokenType {
	TT_NONE, TT_ERROR,
	TT_NIL, TT_BOOL, TT_INT, TT_OP
};

enum Symbol {
	TK_NONE,
	TK_PLUS, TK_MINUS,
	
	TK_RETURN
};

struct Position {
	const char *code, *cur;
	int line, col, pos;
};

struct Token {
	TokenType type;
	Position origin;
	
	union TokenValue {
		bool b;
		esp_int i;
		Symbol sym;
	} value;
	
	Token(TokenType tt, Position ori, bool v);
	Token(TokenType tt, Position ori, int i);
	Token(TokenType tt, Position ori, esp_int i);
	Token(TokenType tt, Position ori, Symbol sym);
};

struct Lexer {
	Position pos;
	Token lookahead;
	
	Lexer(const char* code);
	
	void advance();
	bool nextToken();
	bool consumeToken();
	
	bool matchChar(int c);
	int nextChar();
	void consumeChar();
	
	void ignoreSpace();
	
	bool nextOperator();
	bool nextNumber();
	bool nextIdent();
};

}

#endif
