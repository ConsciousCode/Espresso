/**
 * Define the operations used by the VM.
**/
#ifndef ESPRESSO_VM_OPS_H
#define ESPRESSO_VM_OPS_H

#include <string>

namespace esp {
namespace vm {

/**
 * The opcodes used by the VM.
**/
enum Opcode {
	OP_NOP, OP_CONST, OP_IMM,
	OP_NIL, OP_BOOL, OP_MOVE,
	
	OP_JMP, OP_IF, OP_CALL, OP_RETURN, OP_FAIL,
	OP_GETATTR, OP_SETATTR, OP_HASATTR, OP_DELATTR,
	
	OP_NEG, OP_POS, OP_INV, OP_NOT, OP_INC, OP_DEC,
	
	OP_ADD, OP_SUB,
	OP_MUL, OP_DIV, OP_IDIV, OP_MOD, OP_IMOD,
	
	OP_AND, OP_OR, OP_BAND, OP_BOR, OP_BXOR,
	OP_GT, OP_GTE, OP_LT, OP_LTE, OP_EQ, OP_NE,
	
	OP_SHL, OP_SHR
};

/**
 * A VM operation consists of one opcode and an optional payload.
 *
 * In general, symbol[a] = op(symbol[b], symbol[c])
**/
struct Operation {
	Opcode op;
	
	int a, b, c;
	
	Operation();
	Operation(Opcode oc, int x, int y, int z);
	
	std::string disasm();
};

}
}

#endif
