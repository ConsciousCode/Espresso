/**
 * The main parsing header.
**/
#ifndef ESPRESSO_PARSE_HPP
#define ESPRESSO_PARSE_HPP

#include "value.hpp"

namespace esp {
	Function* parse(const std::string& code);
}

#endif
