#include <iostream>

#include "espresso.hpp"

using namespace std;

int main() {
	esp::Environment env;
	
	auto fn = esp::parse("1 + 2 / 3");
	cout << "Exec " << env.exec(fn).toString() << std::endl;
	
	return 0;
}
