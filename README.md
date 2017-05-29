**Espresso** is a language combining the best elements of Javascript, Lua, Python, Ruby, Scala, and Lisp with a few novel ideas thrown into the mix. It is meant to be fast, lightweight, easy to read, and easy to write.

This codebase was forked from [Esprima](https://github.com/jquery/esprima) to help jumpstart the language's design. Esprima is 1.) in JS, 2.) relatively small and easy to understand, and 3.) parses JS, which has a large amount of syntactic and semantic overlap with Espresso.

### API

A simple example on Node.js REPL:

```javascript
> var espresso = require('espresso');
> var program = 'var answer = 42';

> espresso.tokenize(program);
[ { type: 'Keyword', value: 'var' },
  { type: 'Identifier', value: 'answer' },
  { type: 'Punctuator', value: '=' },
  { type: 'Numeric', value: '42' } ]
  
> espresso.parse(program);
{ type: 'VariableDeclaration',
   declarations: [Object],
   kind: 'var' }
```

### Design Goals
At a high level, Espresso has been designed to be fast (easy to optimize), lightweight, easy to read, and easy to write. To accomplish this, some specific goals were pursued:

* Minimize the number of keywords, preferring to reuse before introducing new ones. Similarly, avoid keywords which can only be used in special cases.
* Introduce syntactic restrictions only when it disambiguates semantics.
* Keep the syntax as regular as possible with minimal contextual reinterpration.
* Try to combine related concepts wherever possible.
* Keep syntax and semantics as consistent as humanly possible.

### Syntax

#### Parentheses
In Espresso, parentheses, square brackets, and curly braces are almost completely interchangeable, only distinguished in how `use` and `var` use them.

#### Variables
Variables are scoped by the innermost grouping. They can be declared with either the `var` or `def` keywords - var indicates variables while def indicates constants. Both have the same syntax otherwise. A variable declaration uses the format `var name = init, ...`. Alternatively, one can use a destructuring pattern much like ECMA6. There are 3 variations of this syntax:
* `var (a, b, c) = expr` assigns `expr` to `a`, `b`, and `c` simultaneously.
* `var [a=x, b=y, c=z, ...d] = expr` expects `expr` to be an iterable and assigns the first, second, and third elements to `a`, `b`, and `c` , respectively - if the iterable lacks any of these indices, `x`, `y`, and `z` provide defaults. `d` consumes the rest of the iterable, if any, and without it iteration would terminate at the third value.
* `var {a:u=x, b:v=y, c:w=z} = expr` expects `expr` to be any object. The colons indicate source:destination identifier pairs, and the equals sign allows you to optionally assign defaults. Accesses to nonexistent keys fail by default in Espresso.

These destructuring patterns can be used without declaring variables with the `use` keyword, which acts as a placeholder for `var` or `def`.

#### Values
`true`, `false`, and `nil` are the 3 keyword-constants.

A `let` expression declares a function. It can be used inline or as a declaration, and follows the general syntax `let name(a, b, c, ..d) expr`.

An `enum` expression declares an enumeration which will expose its enumerations globally if it has no name, otherwise putting them in its namespace. Enumerations can have any value, but cannot be guaranteed to have a particular value unless explicitly assigned. Enumerations are comma-separated.

A `proto` expression takes the following group and uses the resulting namespace as an object intended for use as a prototype. This can be used to roughly approximate class declarations.

Integers can be binary, octal, or hexadecimal using the 0b, 0o, or 0x  prefixes, or decimal otherwise. No warning will be emitted for a prepended 0 with no following base. All of these can also have a decimal point to represent floating point numbers, and a number can have any number of spaces between its characters.

Strings can use one of 3 quote styles, `'...'`, `"..."`, and ``...``. Adjacent strings are automatically appended. Strings can contain identifier escape sequences using the format `@{name}` - the @ symbol is used instead of the traditional $ to make formatting strings easier to write.

Arrays and dictionaries use the same combined syntax (much like Lua) and are defined by the comma-colon "operator". Essentially, any sequence of comma-separated expressions (with non-adjacent colons) is considered an object literal, which can be considered an array or dictionary by the key types. Keys read as identifiers are assumed to be strings, and can alternatively be ordinary expressions (escapable via grouping).

#### Comments
Comments can be single-line, starting with a single #, or they can be multi-line, starting with `#(`, `#[`, `#{` and ending with `)#`, `]#`, `}#`. Multi-line comments are recursive, so they can have comments within them, though this feature is intended to be used more for large block commenting rather than documentation.

### Semantics

#### Expressions & Statements
Everything in Espresso, other than low-level syntax, is an expression.

Some intuitively ambiguous examples are:
* The aggregation operator (;) evaluates its operands and returns the last value.
* `while` and `for` evaluate to generators of their bodies which auto-iterate when included in a semicolon expression.
* `if C [then] A [else B]` evaluates to A if C is true, else B. If there is no else clause and C is false, it evaluates to `nil`.
* `try [as E] A [else B]` evaluates as A if A doesn't generate an error, else it evaluates as B with the thrown error being named E.
* Variable declarations, e.g. `var a = 10`, evaluates to the last variable in the list.
* A `case`-`when` expression evaluates to the final `when` or `else` clause visited, or `nil` if there is no else clause.
* `break continue redo return fail` don't evaluate to anything because they represent jumps in the program's control flow.
* `yield` evaluates to its operand.
* `with` evaluates to its body.
* `do` indicates a block of code which is to be run like a nullary function sharing an outer namespace which is called immediately. Yes, `do while` will work too as expected.

#### The Prototype Chain
Espresso borrows its object model heavily from Javascript and Lua. It uses prototype-based programming in which behavior reuse is done by deferring to an object's _prototype_. Espresso takes this concept a step further by noting that this idea of prototyping can be extended to include variable changes, allowing a theoretical basis for true immutability in a script setting and enabling much more effective optimizations. Essentially, the contract between a prototype and its child guarantees that what was in the prototype will be in the prototype forever, and nothing will ever be added later; prototypes are immutable. 

To ensure prototypes are immutable, all objects are considered "immutable" upon creation, with the sole exception of references. Any changes are committed by making a new object prototyped by the old and shadowing an older property, then referring to that new object in place of the old. Lexical bindings and references refer to this most recent object, creating the illusion of change. Of course in practice this will almost never be done - instead, implementations are encouraged to change objects with one reference at will or collapse object changes in the chain once they no longer need to be distinguished. An object's prototype cannot be referred to explicitly, only the prototype chain as a whole.

This is also used to solve a perceived problem in Lua and Python dictionaries, which can have keys of arbitrary values but must have contracts of immutability which cannot be enforced. In this way, keys entered into an object refer to the prototype chain version at the time of insertion and can't ever be changed afterwards.
