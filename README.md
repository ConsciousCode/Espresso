**Espresso** is a language combining the best elements of Javascript, Lua, Python, and Lisp with a few novel ideas thrown into the mix. It is meant to be fast, lightweight, easy to read, and easy to write.

This codebase was forked from [Esprima](https://github.com/jquery/esprima) to help jumpstart the language's design. Esprima is 1.) in JS, 2.) relatively small and easy to understand, and 3.) parses JS, which has a large amount of syntactic overlap with Espresso.

### API

A simple example on Node.js REPL:

```javascript
> var espresso = require('espresso');
> var program = 'const answer = 42';

> espresso.tokenize(program);
[ { type: 'Keyword', value: 'const' },
  { type: 'Identifier', value: 'answer' },
  { type: 'Punctuator', value: '=' },
  { type: 'Numeric', value: '42' } ]
  
> espresso.parse(program);
{ type: 'VariableDeclaration',
   declarations: [Object],
   kind: 'const' }
```
