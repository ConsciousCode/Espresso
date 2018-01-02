#include <cstdlib>
#include <string>
#include <cctype>

#include "token.hpp"

namespace esp {

bool isIdentStart(int c) {
	return isalpha(c) || c == '$' || c == '_' || c == '?';
}

Token::Token() {}
Token::Token(TokenType tt, Position ori, size_t len, bool v):type(tt), origin(ori), length(len) {
	value.b = v;
}
Token::Token(TokenType tt, Position ori, size_t len, int v):Token(tt, ori, len, (esp_int)v) {}
Token::Token(TokenType tt, Position ori, size_t len, esp_int v):type(tt), origin(ori), length(len) {
	value.i = v;
}
Token::Token(TokenType tt, Position ori, size_t len, Symbol v):type(tt), origin(ori), length(len) {
	value.sym = v;
}

Lexer::Lexer(const char* code) {
	pos.code = code;
	pos.cur = code;
	pos.line = 1;
	pos.col = pos.pos = 0;
	
	consumeToken();
}

void Lexer::advance() {
	++pos.cur;
	++pos.pos;
}

bool Lexer::nextToken() {
	auto tt = lookahead.type;
	
	if(tt == TT_NONE || tt == TT_ERROR) {
		return false;
	}
	else {
		auto tok = consumeToken();
		cout << "NEXT " << lookahead.type << " " <<  std::string(lookahead.origin.cur) << std::endl;
		return tok;
	}
}

bool Lexer::consumeToken() {
	ignoreSpace();
	
	return
		nextIdent() ||
		nextNumber() ||
		nextOperator();
}

bool Lexer::matchChar(int m) {
	if(nextChar() == m) {
		consumeChar();
		return true;
	}
	else {
		return false;
	}
}

int Lexer::nextChar() {
	return *pos.cur;
}

void Lexer::consumeChar() {
	advance();
	if(*pos.cur == '\r') {
		if(pos.cur[1] == '\n') {
			advance();
		}
	}
	else if(*pos.cur != '\n') {
		return;
	}
	
	++pos.line;
	pos.col = 0;
}

void Lexer::ignoreSpace() {
	while(isspace(nextChar())) {
		consumeChar();
	}
}

/**
 * Parse all symbol-based operators
**/
bool Lexer::nextOperator() {
	if(matchChar('+')) {
		lookahead = Token(TT_OP, pos, 1, TK_PLUS);
		return true;
	}
	
	return false;
}

/**
 * Handles identifiers, including the literals
**/
bool Lexer::nextIdent() {
	auto* beg = pos.cur;
	auto c = nextChar();
	
	while(isIdentStart(c)) {
		consumeChar();
		c = nextChar();
	}
	
	if(beg == pos.cur) {
		return false;
	}
	
	std::string kw(beg, pos.cur - beg);
	
	if(kw == "nil") {
		lookahead = Token(TT_NIL, pos, 3, 0);
	}
	else if(kw == "true") {
		lookahead = Token(TT_BOOL, pos, 4, true);
	}
	else if(kw == "false") {
		lookahead = Token(TT_BOOL, pos, 5, false);
	}
	else {
		return false;
	}
	
	return true;
}

/**
 * Handles all number types, for now just decimal.
**/
bool Lexer::nextNumber() {
	auto start = pos;
	int v = 0, c = nextChar();
	
	if(isdigit(c)) {
		do {
			consumeChar();
			
			v *= 10;
			v += c - '0';
			c = nextChar();
		} while(isdigit(c));
		
		lookahead = Token(TT_INT, start, pos.cur - start.cur, v);
		return true;
	}
	else {
		return false;
	}
}

}
