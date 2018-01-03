#include "parse.hpp"
#include "token.hpp"
#include "ops.hpp"

namespace esp {
namespace vm {

/**
 * Structure of all the data used to build a function.
**/
struct FunctionBuilder {
	FunctionBuilder* outer;
	Function* func;
	
	FunctionBuilder(FunctionBuilder* outer=nullptr) {
		outer = outer;
		func = new Function();
	}
	
	void push(Opcode op, int a, int b, int c) {
		func->code.push_back(Operation(op, a, b, c));
	}
	void pushNil() {
		push(vm::OP_NIL, -1, 0, 0);
	}
	void pushBool(bool b) {
		push(vm::OP_BOOL, -1, b, 0);
	}
	void pushInt(int i) {
		push(vm::OP_IMM, -1, i, 0);
	}
	void pushBinop(Opcode op) {
		push(op, -1, -1, -1);
	}
};

struct Parser {
	FunctionBuilder builder;
	Lexer lexer;
	
	Parser(const std::string& code):lexer(code.c_str()) {}
	
	bool match(TokenType tt) {
		if(lexer.lookahead.type == tt) {
			lexer.consumeToken();
			return true;
		}
		
		return false;
	}

	int parseAtom() {
		switch(lexer.lookahead.type) {
			case TT_NIL:
				builder.pushNil();
				return -1;
			
			case TT_BOOL:
				builder.pushBool(lexer.lookahead.value.b);
				return -1;
			
			case TT_INT:
				builder.pushInt(lexer.lookahead.value.i);
				return -1;
			
			default:
				debug::print("Unexpected token", lexer.lookahead);
				throw std::runtime_error("Not an atom");
		}
	}

	struct BinaryOp {
		Opcode op;
		int precedence;
		bool leftassoc;
	};

	#define LEFT true
	#define RIGHT false

	BinaryOp binaryOpProps(Symbol op) {
		switch(op) {
			case TK_PLUS: return {OP_ADD, 1, LEFT};
			case TK_MINUS: return {OP_SUB, 1, LEFT};
			case TK_ASTERISK: return {OP_MUL, 2, LEFT};
			case TK_FSLASH: return {OP_DIV, 2, LEFT};
			case TK_PERCENT: return {OP_MOD, 2, LEFT};
			
			default:
				return {OP_NOP, 0, LEFT};
		}
	}

	bool parseBinaryOp(BinaryOp* binop) {
		if(lexer.lookahead.type == TT_OP) {
			*binop = binaryOpProps(lexer.lookahead.value.sym);
			return true;
		}
		
		return false;
	}

	int parseExpression(int minprec) {
		BinaryOp binop;
		
		int lhs = parseAtom();
		lexer.consumeToken();
		while(
			parseBinaryOp(&binop) && binop.precedence >= minprec
		) {
			lexer.consumeToken();
			parseExpression(binop.precedence + binop.leftassoc);
			builder.pushBinop(binop.op);
			lhs = -1;
		}
		
		return lhs;
	}
};

} /* namespace vm */

Function* parse(const std::string& code) {
	vm::Parser p(code);
	p.parseExpression(0);
	return p.builder.func;
}

} /* namespace esp */
