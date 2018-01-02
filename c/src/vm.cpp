#include "vm.hpp"
#include "value.hpp"
#include "parse.hpp"

namespace esp {
namespace vm {

#define IMPL_OP(op) \
	store(pc->a, Value((load(pc->b) op load(pc->c)).value())); \
	break;

/**
 * A frame of the environment call stack.
**/
struct StackFrame {
	/**
	 * Currently executing function
	**/
	Function* fun;
	/**
	 * Program counter
	**/
	std::vector<Operation>::iterator pc;
	
	/**
	 * Essentially the register file of this frame, with a size of fun->slots
	**/
	std::vector<Value> var;
	
	/**
	 * The stack machine's temporary stack
	**/
	std::vector<Value> stack;
	
	StackFrame(Function* f):fun(f), pc(f->code.begin()), var(f->slots) {}
	
	void push(Value v) {
		stack.push_back(v);
	}
	
	Value pop() {
		Value top = stack.back();
		stack.pop_back();
		return top;
	}
	
	void store(int index, Value v) {
		if(index < 0) {
			stack.insert(stack.end() + index + 1, v);
		}
		else {
			var[index] = v;
		}
	}
	
	Value load(int index) {
		if(index < 0) {
			// Stack variables erase themselves on access
			auto v = stack[stack.size() + index];
			stack.erase(stack.end() + index);
			return v;
		}
		else {
			return stack[index];
		}
	}
	
	Result exec(Environment* env) {
		for(;pc != fun->code.end(); ++pc) {
			switch(pc->op) {
				case OP_NOP: continue;
				
				case OP_NIL:
					store(pc->a, Value::nil);
					break;
				
				case OP_BOOL:
					store(pc->a, Value(!!pc->b));
					break;
				
				case OP_IMM:
					store(pc->a, Value(pc->b));
					break;
				
				case OP_MOVE:
					if(pc->c) {
						store(pc->a, load(pc->b));
					}
					else if(pc->b < 0) {
						store(pc->a, stack[stack.size() + pc->b - 1]);
					}
					else {
						store(pc->a, stack[pc->b]);
					}
					
					break;
				
				case OP_ADD: IMPL_OP(+);
				case OP_SUB: IMPL_OP(-);
				case OP_MUL: IMPL_OP(*);
				case OP_DIV: IMPL_OP(/);
				case OP_IDIV:
					store(pc->a, Value((load(pc->b).idiv(load(pc->c))).value()));
					break;
				case OP_MOD: IMPL_OP(%);
				case OP_IMOD:
					store(pc->a, Value((load(pc->b).imod(load(pc->c))).value()));
					break;
				
				default:
					cout << "BAD OP" << std::endl;
					break;
			}
		}
		
		return pop();
	}
};

} /* namespace vm */

Environment::Environment() {
	
}
Environment::~Environment() {
	
}

Result Environment::call(Function* fn, Value self, std::vector<Value> args) {
	vm::StackFrame frame(fn);
	for(auto a : args) {
		frame.push(a);
	}
	frame.push(self);
	return frame.exec(this);
}

Result Environment::call(Function* fn, std::vector<Value> args) {
	return call(fn, Value::nil, args);
}

Result Environment::exec(Function* fn) {
	vm::StackFrame frame(fn);
	return frame.exec(this);
}

Result Environment::exec(const std::string& code) {
	auto fn = esp::parse(code);
	auto res = exec(fn);
	delete fn;
	return res;
}

} /* namespace esp */
