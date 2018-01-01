#include "ops.hpp"

namespace esp {
namespace vm {
	
Operation::Operation() {}
Operation::Operation(Opcode oc, int x, int y, int z)
	:op(oc), a(x), b(y), c(z) {}

std::string regit(int x) {
	if(x == -1) {
		return "top";
	}
	return std::to_string(x);
}
#define UNARY(mn) \
	(mn " ") + regit(a) + " <- " + regit(b)

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
			return "nil " + regit(a);
		case OP_BOOL:
			return "bool " + regit(a) + " <- " + (b? "true" : "false");
		case OP_MOVE:
			return UNARY("mov");
		
		default:
			return "OTHER";
	}
}

}
}
