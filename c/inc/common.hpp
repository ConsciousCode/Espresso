/**
 * Header for definitions common throughout the project.
**/
#ifndef ESPRESSO_COMMON_HPP
#define ESPRESSO_COMMON_HPP

#include <cstdint>
#include <cstddef>
#include <iostream>
using std::cout;

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

}

#endif
