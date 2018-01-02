/**
 * Header for definitions common throughout the project.
**/
#ifndef ESPRESSO_COMMON_HPP
#define ESPRESSO_COMMON_HPP

#include <cstdint>
#include <cstddef>
#include <iostream>
using std::cout;

#ifdef DEBUG

#include <iostream>
#include <sstream>
#include <type_traits>

#endif

namespace esp {

// For convenience
typedef unsigned uint;

// Typedef of the integer type used internall by the VM
typedef intptr_t esp_int;

// Floats are very poorly defined by the spec, so we select the float
//  type which best matches the width of esp_int.
namespace {
	template<bool f, bool d, bool ld>
	struct _select_real;
	
	// sizeof(esp_int) == sizeof(long double), so it doesn't matter
	//  how big float or double are
	template<bool f, bool d>
	struct _select_real<f, d, true> {
		typedef long double type;
	};
	// sizeof(esp_int) == sizeof(double), sizeof(float) doesn't matter
	//  and because of the above case, we know for a fact it isn't ld.
	template<bool f>
	struct _select_real<f, true, false> {
		typedef double type;
	};
	// sizeof(esp_int) == sizeof(float), all other cases are handled
	//  above.
	template<>
	struct _select_real<true, false, false> {
		typedef float type;
	};
	
	// Somehow every float type is larger than esp_int, so we'll pick
	//  the smallest available.
	template<>
	struct _select_real<false, false, false> {
		typedef float type;
	};
	
	template<size_t size>
	struct _real_by_size {
		// Select the largest float type which can fit in esp_int's width.
		typedef typename _select_real<
			(sizeof(float) <= size),
			(sizeof(double) <= size),
			(sizeof(long double) <= size)
		>::type type;
	};
}

// esp_real is the typedef for the real value type used by the VM.
typedef typename _real_by_size<sizeof(esp_int)>::type esp_real;

namespace debug {
#ifdef DEBUG

namespace {
	using namespace std;
	
	template<typename T, typename = decltype(
		declval<stringstream>() << declval<T>()
	)> true_type _can_sstream(const T&);
	false_type _can_sstream(...);
	
	template<typename T>
	constexpr bool can_sstream =
		decltype(_can_sstream(declval<T>()))::value;
	
	template<typename T,
		typename = decltype(std::begin(declval<T>())),
		typename = decltype(std::end(declval<T>()))
	> true_type _can_iter(const T&);
	false_type _can_iter(...);
	
	template<typename T>
	constexpr bool can_iter =
		decltype(_can_iter(declval<T>()))::value;
	
	template<typename T, bool a, bool b>
	struct generic_toString {
		static std::string call(const T& v) {
			stringstream ss;
			ss << '<' << typeid(T).name() <<
				" @ 0x" << std::hex << (intptr_t)&v << '>';
			return ss.str();
		}
	};
	
	template<typename T, bool b>
	struct generic_toString<T, true, b> {
		static std::string call(const T& v) {
			stringstream ss;
			ss << v;
			return ss.str();
		}
	};
	
	template<typename T>
	struct generic_toString<T, false, true> {
		std::string call(const T& v) {
			if(std::begin(v) == std::end(v)) {
				return "{}";
			}
			
			auto it = std::begin(v);
			stringstream ss;
			
			ss << '{';
			ss << *(it++);
			
			for(;it != std::end(v); ++it) {
				ss << ", " << *it;
			}
			ss << '}';
			
			return ss.str();
		}
	};
}

template<typename T>
std::string toString(const T& v) {
	return generic_toString<T,
		decltype(_can_sstream(declval<T>()))::value,
		decltype(_can_iter(declval<T>()))::value
	>::call(v);
}

template<typename L, typename R>
std::string toString(const std::pair<L, R>& v) {
	return toString(v.left) + ':' + toString(v.right);
}

inline void print() {
	cout << endl;
}

template<typename T>
void print(const T& v) {
	cout << toString(v) << endl;
}

template<typename T, typename... ARGS>
void print(const T& v, ARGS... args) {
	cout << toString(v) << ' ';
	print(args...);
}
#else
template<typename... ARGS>
void print(ARGS... args) {}

inline void print() {}

#endif
} /* namespace debug */
} /* namespace esp */

#endif
