espresso.js:
	tsfmt -r src/*.ts && tsc -p src/ && webpack && node tools/fixupbundle.js

espresso: espresso.js

.PHONY: espresso clean

clean:
	rm dist/* src/*.js
