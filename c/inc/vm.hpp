/**
 * The main VM header.
**/
#ifndef ESPRESSO_VM_HPP
#define ESPRESSO_VM_HPP

#include <stack>
#include <vector>
#include <string>

#include "common.hpp"
#include "ops.hpp"

namespace esp {
namespace vm {
	struct StackFrame;
}

struct Result;
struct Function;
struct Value;

struct Environment {
	std::stack<vm::StackFrame> stack;
	
	Environment();
	~Environment();
	
	Result call(Function* fn, Value self, std::vector<Value> args);
	Result call(Function* fn, std::vector<Value> args);
	
	Result exec(Function* fn);
	Result exec(const std::string& code);
};

//struct esp_VM_Value* esp_vm_call(struct esp_VM_Env* env, int nargs);

}

#endif
