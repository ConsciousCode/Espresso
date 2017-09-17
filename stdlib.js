function esp_unary(op, a) {
	switch(op) {
		case "+": return a["+"]();
		case '-': return a['-']();
		case 'not': return a.not();
		
		default:
			throw new Error("Unknown unary op " + op);
	}
}

function esp_binary(op, a, b) {
	function either(op, a, b) {
		if(typeof a[op] === 'function') {
			return a[op](a, b);
		}
		else if(typeof b[op] === 'function') {
			return b[op](a, b);
		}
		else {
			throw new Error(`Operator ${op} not supported for ${a} and ${b}`);
		}
	}
	
	switch(op) {
		default: return either(op, a, b);
	}
}

function esp_new(x, args) {
	let n = Object.create(x);
	if(typeof x['new'] === 'function') {
		x['new'].apply(n, args);
	}
	
	return n;
}

if(test) {

}

function esp_if()
