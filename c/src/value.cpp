/**
 * @file value.cpp
 *
 * The expected behavior of the primitive value implementations is to
 *  never produce an error, but allow callbacks to do so.
**/

#include <limits>

#include "common.hpp"
#include "value.hpp"

namespace esp {

constexpr esp_real REAL_NAN = std::numeric_limits<esp_real>::quiet_NaN();
/**
 * This is for consistency with bool, which equates objects with true.
 *  That is, we want if(v) and if(v.toInt()) to have equivalent
 *  behavior.
**/
constexpr esp_int INT_NAN = 1;
/**
 * The value of this is totally arbitrary and need only be non-empty.
 *  This is for
**/
constexpr char STR_NAN[] = "<OBJECT>";

Result Function::call(Environment* env, std::vector<Value> args) {
	if(env) {
		env->call(this, Value::nil, args);
	}
	else {
		Environment env;
		env.call(this, Value::nil, args);
	}
}

std::string Function::disasm() {
	std::string dis;
	for(auto op : code) {
		dis += op.disasm();
		dis += '\n';
	}
	return dis;
}

Value::Value():type(NIL), value(std::monostate()) {}
Value::Value(const Value& v):type(v.type), value(v.value) {}
Value::Value(bool v):type(BOOL), value(v) {}

Value::Value(int8_t v):type(INT), value((esp_int)v) {}
Value::Value(int16_t v):type(INT), value((esp_int)v) {}
Value::Value(int32_t v):type(INT), value((esp_int)v) {}
Value::Value(int64_t v):type(INT), value((esp_int)v) {}

// Overload all float types to avoid type ambiguity
Value::Value(float v):type(REAL), value((esp_real)v) {}
Value::Value(double v):type(REAL), value((esp_real)v) {}
Value::Value(long double v):type(REAL), value((esp_real)v) {}

Value::Value(const char* v):type(STRING), value(std::string(v)) {}
Value::Value(const std::string& v):type(STRING), value(v) {}

bool Value::toBool() {
	switch(type) {
		case NIL: return false;
		case BOOL: return std::get<bool>(value);
		case INT: return std::get<esp_int>(value);
		case REAL: return std::get<esp_real>(value);
		case STRING: return std::get<std::string>(value).size();
		case OBJECT: {
			auto v = callMethod("toBool");
			return v.isObject() || v.toBool();
		}
		
		default: return true;
	}
}

esp_int Value::toInt() {
	switch(type) {
		case NIL: return 0;
		case BOOL: return std::get<bool>(value);
		case INT: return std::get<esp_int>(value);
		case REAL: return std::get<esp_real>(value);
		case STRING: return std::stoi(std::get<std::string>(value));
		case OBJECT: {
			// toInt MUST return something which can be trivially
			//  resolved to an int without further calls, otherwise
			//  infinite loops can occur.
			auto v = callMethod("toInt");
			return v.isObject()? INT_NAN : v.toInt();
		}
		
		default: return INT_NAN;
	}
}

esp_real Value::toReal() {
	switch(type) {
		case NIL: return 0.0;
		case BOOL: return std::get<bool>(value);
		case INT: return std::get<esp_int>(value);
		case REAL: return std::get<esp_real>(value);
		case STRING: return std::stod(std::get<std::string>(value));
		case OBJECT: {
			// toReal MUST return something which can be trivially
			//  resolved to a real without further calls, otherwise
			//  infinite loops can occur.
			auto v = callMethod("toReal");
			return v.isObject()? REAL_NAN : v.toReal();
		}
		
		default: return REAL_NAN;
	}
}

MethodProxy Value::get(const std::string& k) {
	return MethodProxy();
}

void Value::set(const std::string& k, Value v) {
	/* TODO */
}

bool Value::has(const std::string& k) {
	/* TODO */
	return false;
}

bool Value::del(const std::string& k) {
	/* TODO */
	return false;
}

bool Value::hasMethod(const std::string& s) {
	return has(s) && get(s).isFunction();
}

std::string Value::toString() {
	switch(type) {
		case NIL: return "nil";
		case BOOL: return std::get<bool>(value)? "true" : "false";
		case INT: return std::to_string(std::get<esp_int>(value));
		case REAL: return std::to_string(std::get<esp_real>(value));
		case STRING: return std::get<std::string>(value);
		case OBJECT: {
			// toString MUST return something which can be trivially
			//  resolved to a string without furcallMethodther calls, otherwise
			//  infinite loops can occur.
			auto v = callMethod("toString");
			return v.isObject()? STR_NAN : v.toString();
		}
		
		case FUNCTION: return "function";
		
		default: return "Unknown type";
	}
}

#define OVERLOAD(op) \
	if(isObject()) { \
		if(hasMethod(op)) { \
			return callMethod(op, rhs); \
		} \
	}

#define INT_OP(op) \
	if(isInt()) { \
		return Value(toInt() op rhs.toInt()); \
	}

#define REAL_OP(op) \
	if(isReal()) { \
		return Value(toReal() op rhs.toReal()); \
	}

#define NUMBER_OP(op) \
	if(isNumber()) { \
		return Value(toReal() op rhs.toReal()); \
	}

#define STD_OP(op) \
	INT_OP(op) \
	else REAL_OP(op) \
	else OVERLOAD(#op)

Result Value::operator+(Value rhs) {
	STD_OP(+)
	return Value(toString() + rhs.toString());
}
Result Value::operator-(Value rhs) {
	STD_OP(-)
	if(rhs.isInt()) {
		return Value(toInt() - rhs.toInt());
	}
	// Even if rhs isn't real, treat it like it is
	else {
		return Value(toReal() - rhs.toReal());
	}
}
Result Value::operator*(Value rhs) {
	STD_OP(*)
	else if(isString()) {
		// Pythonic str*int
		if(rhs.isNumber()) {
			auto n = rhs.toInt();
			auto period = std::get<std::string>(value).size();
			
			if(n == 0) {
				return Value("");
			}
			else if(n == 1 || std::get<std::string>(value).empty()) {
				return *this;
			}
			else if(period == 1) {
				return Value(std::string(n, std::get<std::string>(value)[0]));
			}
			else {
				std::string str;
				str.reserve(n*period);
				auto i = 1;
				for(; i < n/2; i *= 2) {
					str += str;
				}
				str.append(str, 0, n - i/2);
				
				return Value(str);
			}
		}
	}
	
	if(rhs.isReal()){
		return Value(toReal() * rhs.toReal());
	}
	return Value(toInt() * rhs.toInt());
}
Result Value::operator/(Value rhs) {
	NUMBER_OP(/)
	else OVERLOAD("/")
	
	return Value(toReal() / rhs.toReal());
}
Result Value::idiv(Value rhs) {
	if(isNumber()) {
		return Value(toInt() * rhs.toInt());
	}
	else OVERLOAD("//")
	
	return Value(toInt() / rhs.toInt());
}
Result Value::operator%(Value rhs) {
	OVERLOAD("%")
	return Value(fmod(toReal(), rhs.toReal()));
}
Result Value::imod(Value rhs) {
	if(isNumber()) {
		return Value(toInt() * rhs.toInt());
	}
	else OVERLOAD("%%")
	
	return Value(toInt() % rhs.toInt());
}

#define BOOL_OP(op) \
	Result Value::operator op(Value rhs) { \
		NUMBER_OP(op) \
		else if(isString()) { \
			auto cmp = std::get<std::string>(value).compare(rhs.toString()); \
			return Value(cmp op 0); \
		} \
		else OVERLOAD(#op) \
		return Value(toReal() op rhs.toReal()); \
	}

BOOL_OP(>)
BOOL_OP(>=)
BOOL_OP(<)
BOOL_OP(<=)
BOOL_OP(!=)
BOOL_OP(==)

#define BIT_OP(op) \
	Result Value::operator op(Value rhs) { \
		OVERLOAD(#op) \
		return Value(toInt() op rhs.toInt()); \
	}

BIT_OP(&)
BIT_OP(|)
BIT_OP(^)
BIT_OP(<<)
BIT_OP(>>)

Value& Value::operator++() {
	*this = *this + Value(1);
	return *this;
}

Value& Value::operator--() {
	*this = *this - Value(1);
	return *this;
}

Result Value::operator-() {
	if(isInt()) {
		return Value(-toInt());
	}
	else if(isReal()) {
		return Value(-toReal());
	}
	else if(isString()) {
		// TODO: Custom implementation which returns either int or real
		return Value(-toReal());
	}
	else if(isObject()) {
		if(hasMethod("-@")) {
			return callMethod("-@");
		}
	}
	return REAL_NAN;
}
Result Value::operator+() {
	if(isInt()) {
		return Value(+toInt());
	}
	else if(isReal()) {
		return Value(+toReal());
	}
	else if(isString()) {
		// TODO: Custom implementation which returns either int or real
		return Value(+toReal());
	}
	else if(hasMethod("+@")) {
		return callMethod("+@");
	}
	return REAL_NAN;
}
Result Value::operator~() {
	if(hasMethod("~@")) {
		return callMethod("~@");
	}
	return Value(~toInt());
}
Result Value::operator!() {
	if(hasMethod("!@")) {
		return callMethod("!@");
	}
	return Value(!toBool());
}

Result Value::call(Environment* env, Value self) {
	std::vector<Value> als(0);
	if(isFunction()) {
		return env->call(std::get<Function*>(value), self, als);
	}
	else {
		return nil;
	}
}

Result Value::call(Value self) {
	return call(nullptr, self);
}

Result Value::call() {
	return call(nullptr, nil);
}

Result Value::callMethod(Environment* env, const std::string& name) {
	return get(name).call(env, *this);
}

Result Value::callMethod(const std::string& name) {
	return callMethod(nullptr, name);
}

Value Value::nil;

}
