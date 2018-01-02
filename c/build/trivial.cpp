#include <iostream>

#include "espresso.hpp"

using namespace std;

int main() {
	esp::Environment env;
	
	cout << "Keyword literals..." << std::endl;
	cout << env.exec("nil").toString() << std::endl;
	cout << env.exec("true").toString() << std::endl;
	cout << env.exec("false").toString() << std::endl;
	
	auto fn = esp::parse("1 + 2");
	cout << fn->disasm() << std::endl;
	
	cout << "Numeric literals..." << std::endl;
	cout << env.exec("4").toString() << std::endl;
	cout << env.exec("24895323").toString() << std::endl;
	cout << env.exec("0").toString() << std::endl;
	cout << env.exec("0888").toString() << std::endl;
	
	return 0;
}
