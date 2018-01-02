/**
 * Definitions for the value classes.
**/
#ifndef ESPRESSO_VALUE_HPP
#define ESPRESSO_VALUE_HPP

#include <cmath>
#include <stdexcept>
#include <map>
#include <vector>
#include <variant>
#include <string>
#include <cassert>

#include "common.hpp"
#include "vm.hpp"
#include "ops.hpp"

namespace esp {

struct Object;
struct Function;
struct Value;
struct MethodProxy;
struct Result;

struct Object {
	std::map<std::string, Value> entries;
};

/**
 * A set of instructions which can run on the VM.
**/
struct Function {
	std::vector<vm::Operation> code;
	uint slots;
	
	Result call(Environment* env, std::vector<Value> args);
	
	std::string disasm();
};

/**
 * Boxed value. By design, this is meant to be passed by value
**/
struct Value {
	/**
	 * Tags for the value union. These values will not be consistent across
	 *  implementations, they need only be powers of 2 for type masks.
	**/
	enum Type {
		NIL = 1, BOOL = 2,
		INT = 4, REAL = 8, STRING = 16,
		OBJECT = 32, FUNCTION = 64
	} type;
	
	std::variant<
		std::monostate,
		bool, esp_int, esp_real, std::string,
		Function*, Object* //, void*
	> value;
	
	static Value nil;

	Value();
	Value(const Value& v);
	Value(bool v);
	
	// Overload all integer types to avoid type ambiguity
	Value(int8_t v);
	Value(int16_t v);
	Value(int32_t v);
	Value(int64_t v);
	
	// Overload all float types to avoid type ambiguity
	Value(float v);
	Value(double v);
	Value(long double v);
	
	Value(const char* v);
	Value(const std::string& v);

#ifdef DEBUG
	#define VALUE_IS(vt, name, native) \
		inline bool is##name() { \
			assert( \
				(type == (vt)) == std::holds_alternative<native>(value) \
			); \
			return type == (vt); \
		}
#else
	#define VALUE_IS(vt, name, native) \
		inline bool is##name() { \
			return type == (vt); \
		}
#endif
	
	VALUE_IS(NIL, Nil, std::monostate)
	VALUE_IS(BOOL, Bool, bool)
	VALUE_IS(INT, Int, esp_int)
	VALUE_IS(REAL, Real, esp_real)
	
	inline bool isNumber() {
		return isInt() || isReal();
	}
	
	VALUE_IS(STRING, String, std::string)
	VALUE_IS(FUNCTION, Function, Function*)
	VALUE_IS(OBJECT, Object, Object*)
	
	inline bool isCallable() {
		return isFunction() || hasMethod("()");
	}

#undef VALUE_IS
	
	bool toBool();
	esp_int toInt();
	esp_real toReal();
	std::string toString();
	
	/**
	 * No integer or real type coercion because it produces ambiguity.
	**/
	
	inline operator bool() {
		return toBool();
	}
	
	inline operator std::string() {
		return toString();
	}
	
	MethodProxy get(const std::string& k);
	void set(const std::string& k, Value v);
	bool has(const std::string& k);
	bool del(const std::string& k);
	
	bool hasMethod(const std::string& s);
	
	template<typename... ARGS>
	Result call(Environment* env, Value self, ARGS... args);
	template<typename... ARGS>
	Result call(Value self, ARGS... args);
	
	Result call(Environment* env, Value self);
	Result call(Value self);
	Result call();
	
	template<typename... ARGS>
	Result callMethod(
		Environment* env, const std::string& name, ARGS... args
	);
	template<typename... ARGS>
	Result callMethod(const std::string& name, ARGS... args);
	
	Result callMethod(Environment* env, const std::string& name);
	Result callMethod(const std::string& name);
	
	Result operator+(Value rhs);
	Result operator-(Value rhs);
	Result operator*(Value rhs);
	Result operator/(Value rhs);
	Result idiv(Value rhs);
	Result operator%(Value rhs);
	Result imod(Value rhs);
	
	Result operator>(Value rhs);
	Result operator>=(Value rhs);
	Result operator<(Value rhs);
	Result operator<=(Value rhs);
	Result operator!=(Value rhs);
	Result operator==(Value rhs);
	
	Result operator&(Value rhs);
	Result operator|(Value rhs);
	Result operator^(Value rhs);
	Result operator<<(Value rhs);
	Result operator>>(Value rhs);
	
	Value& operator++();
	Value& operator--();
	
	Result operator-();
	Result operator+();
	Result operator~();
	Result operator!();
	
	template<typename... ARGS>
	Result operator()(Value self, ARGS... args);
};

#ifdef DEBUG
inline std::string toString(Value v) {
	return v.toString();
}
#endif

/**
 * The result of a function call.
**/
struct Result : public Value {
protected:
	/**
	 * True if this result is from fail, false if it's from return.
	**/
	bool failed;
	
public:
	inline Result():Value(), failed(false) {}
	
	inline Result(const Value& v):Value(v), failed(false) {}
	
	template<typename T>
	Result(T v):Result(Value(v)) {}
	
	inline bool isFailure() {
		return failed;
	}
	inline bool isSuccess() {
		return !failed;
	}
	
	inline Value value() {
		if(failed) {
			throw std::runtime_error(Value::toString());
		}
		else {
			return *this;
		}
	}
};

/**
 * Used to forward an object to its method call for this.
**/
struct MethodProxy : public Value {
	Value self;
	
	template<typename... REST>
	Result call(Environment* env, REST... rest) {
		Value::call(env, self, rest...);
	}
};

template<typename... ARGS>
Result Value::call(Environment* env, Value self, ARGS... args) {
	std::vector<Value> als = {{args...}};
	if(isFunction()) {
		return env->call(std::get<Function*>(value), self, als);
	}
	else {
		return nil;
	}
}

template<typename... ARGS>
Result Value::call(Value self, ARGS... args) {
	return call(nullptr, self, args...);
}

template<typename... ARGS>
Result Value::callMethod(
	Environment* env, const std::string& name, ARGS... args
) {
	return get(name).call(env, *this, args...);
}

template<typename... ARGS>
Result Value::callMethod(const std::string& name, ARGS... args) {
	return callMethod(nullptr, name, args...);
}

template<typename... ARGS>
Result Value::operator()(Value self, ARGS... args) {
	return call(self, args...);
}

}

#endif
