#include "ops.hpp"

namespace esp {
namespace vm {

const char* op_name(Opcode op) {
	switch(op) {
		case OP_NOP: return "OP_NOP";
		case OP_CONST: return "OP_CONST";
		case OP_IMM: return "OP_IMM";
		case OP_NIL: return "OP_NIL";
		case OP_BOOL: return "OP_BOOL";
		case OP_MOVE: return "OP_MOVE";
		
		case OP_JMP: return "OP_JMP";
		case OP_IF: return "OP_IF";
		case OP_CALL: return "OP_CALL";
		case OP_RETURN: return "OP_RETURN";
		case OP_FAIL: return "OP_FAIL";
		case OP_GETATTR: return "OP_GETATTR";
		case OP_SETATTR: return "OP_SETATTR";
		case OP_HASATTR: return "OP_HASATTR";
		case OP_DELATTR: return "OP_DELATTR";
		
		case OP_NEG: return "OP_NEG";
		case OP_POS: return "OP_POS";
		case OP_INV: return "OP_INV";
		case OP_NOT: return "OP_NOT";
		case OP_INC: return "OP_INC";
		case OP_DEC: return "OP_DEC";
		
		case OP_ADD: return "OP_ADD";
		case OP_SUB: return "OP_SUB";
		case OP_MUL: return "OP_MUL";
		case OP_DIV: return "OP_DIV";
		case OP_IDIV: return "OP_IDIV";
		case OP_MOD: return "OP_MOD";
		case OP_IMOD: return "OP_IMOD";
		
		case OP_AND: return "OP_AND";
		case OP_OR: return "OP_OR";
		case OP_BAND: return "OP_BAND";
		case OP_BOR: return "OP_BOR";
		case OP_BXOR: return "OP_BXOR";
		case OP_GT: return "OP_GT";
		case OP_GTE: return "OP_GTE";
		case OP_LT: return "OP_LT";
		case OP_LTE: return "OP_LTE";
		case OP_EQ: return "OP_EQ";
		case OP_NE: return "OP_NE";
		
		case OP_SHL: return "OP_SHL";
		case OP_SHR: return "OP_SHR";
	}
}
	
Operation::Operation() {}
Operation::Operation(Opcode oc, int x, int y, int z)
	:op(oc), a(x), b(y), c(z) {}

std::string regit(int x) {
	if(x == -1) {
		return "top";
	}
	return std::to_string(x);
}
#define UNARY(mn) regit(a) + (" <- " mn " ") + regit(b)
#define BINARY(mn) regit(a) + (" <- " mn " ") + regit(b) + ' ' + regit(c)

std::string Operation::disasm() {
	switch(op) {
		// Nullary
		case OP_NOP:
			return "nop";
		case OP_CONST:
			return "const";
		case OP_IMM:
			return UNARY("imm");
		case OP_NIL:
			return regit(a) + " <- nil";
		case OP_BOOL:
			return regit(a) + " <- " + (b? "true" : "false");
		case OP_MOVE:
			return UNARY("mov");
		
		case OP_ADD:
			return BINARY("add");
		
		default:
			return op_name(op);
	}
}

}
}
