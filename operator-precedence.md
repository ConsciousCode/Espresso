#### Unary
* \+ \-
* ~ ! not
* ++ --
* ::
* @

#### Binary
* ;
* , =
* || or
* && and
* in is < <= > >= == !=
* \+ \-
* \* / %
* ::
* .

#### Potential operators
* Overloadable
  - a -> b
  - a => b
* Non-overloadable
  - a <| b == { b(a); a } left associative
    - a |> b == b(a) right associative
* Combinational?
  - Any combo of + - * / % ~ ^ & | @ ! ? . : < > , that isn't already defined
  - Might be getting greedy
