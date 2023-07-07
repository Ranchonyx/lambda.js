export default function parse(input) {
    var FALSE = { type: "bool", value: false };
    var PRECEDENCE = {
        "=": 1,
        "||": 2,
        "&&": 3,
        "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
        "+": 10, "-": 10,
        "*": 20, "/": 20, "%": 20,
    };
    return parse_toplevel();

    function is_punc(ch) {
        let tok = input.peek();
        return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
    }
    function is_kw(kw) {
        let tok = input.peek();
        return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
    }
    function is_op(op) {
        let tok = input.peek();
        return tok && tok.type == "op" && (!op || tok.value == op) && tok;
    }

    function skip_punc(ch) {
        if (is_punc(ch)) input.next();
        else input.croak(`Expected punctuation: \"${ch}\"`);
    }
    function skip_kw(kw) {
        if (is_kw(kw)) input.next();
        else input.croak(`Expected keyword: \"${kw}\"`);
    }
    function skip_op(op) {
        if (is_kw(op)) input.next();
        else input.croak(`Expected operator: \"${op}\"`);
    }

    function unexpected() {
        input.croak(`Unexpected token: \"${JSON.stringify(input.peek())}\"`);
    }

    function maybe_binary(left, my_prec) {
        // console.log(`Parsing maybe_binary(${inspect(left, false, 2, true)}, ${my_prec})`)
        let tok = is_op();
        if (tok) {
            let his_prec = PRECEDENCE[tok.value];
            if (his_prec > my_prec) {
                input.next();
                return maybe_binary({
                    type: tok.value == "=" ? "assign" : "binary",
                    operator: tok.value,
                    left: left,
                    right: maybe_binary(parse_atom(), his_prec)
                }, my_prec);
            }
        }
        return left;
    }
    
    function delimited(sta, sto, sep, parser) {
        var a = [], first = true;
        skip_punc(sta);
        while (!input.eof()) {
            if (is_punc(sto)) break;
            if (first) first = false; else skip_punc(sep);
            if (is_punc(sto)) break;
            a.push(parser());
        }
        skip_punc(sto);
        return a;
    }

    function parse_call(func) {
        let ret = {
            type: "call",
            func: func,
            args: delimited("(", ")", ",", parse_expression)
        }
        // console.log(`Parsing function call ${inspect(ret.func, false, 2, true)}(${inspect(ret.args, false, 2, true)})`);
        return ret;
    }
    function parse_varname() {
        let name = input.next();
        // console.log(`Parsing variable name: ${name.value}`);
        if (name.type != "var") input.croak("Expected variable name");
        return name.value;
    }
    function parse_if() {
        skip_kw("if");

        let condition = parse_expression();
        if (!is_punc("{")) skip_kw("then");

        let then = parse_expression();
        let ret = {
            type: "if",
            cond: condition,
            then: then
        };
        if (is_kw("else")) {
            input.next();
            ret.else = parse_expression();
        }
        // console.log(`Parsing if condition: if(${ret.condition}) then ${ret.then}`);
        return ret;
    }
    function parse_lambda() {
        let ret = {
            type: "lambda",
            name: input.peek().type == "var" ? input.next().value : null,
            vars: delimited("(", ")", ",", parse_varname),
            body: parse_expression()
        }
        // console.log(`Parsing lambda expression lambda(${inspect(ret.vars, false, 2, true)}) = {${inspect(ret.body, false, 2, true)}}`);
        return ret;
    }
    function parse_bool() {
        let ret = {
            type: "bool",
            value: input.next().value == "true"
        };
        // console.log(`Parsed boolean ${ret.value}`);
        return ret;
    }

    function parse_let() {
        skip_kw("let");
        if (input.peek().type == "var") {
            let name = input.next().value;
            let defs = delimited("(", ")", ",", parse_vardef);
            return {
                type: "call",
                func: {
                    type: "lambda",
                    name: name,
                    vars: defs.map((def) => def.name),
                    body: parse_expression()
                },
                args: defs.map((def) => def.def || FALSE)
            };
        }
        return {
            type: "let",
            vars: delimited("(", ")", ",", parse_vardef),
            body: parse_expression()
        };
    }

    function parse_vardef() {
        let name = parse_varname(), def;
        if (is_op("=")) {
            input.next();
            def = parse_expression();
        }
        return { name: name, def: def };
    }

    function maybe_call(expr) {
        expr = expr();
        let ret = is_punc("(") ? parse_call(expr) : expr;
        // console.log(`Parsing maybe_call(${inspect(expr, false, 2, true)} ? ${inspect(ret, false, 2, true)})`)
        return ret;
    }

    function parse_atom() {
        return maybe_call(() => {
            if (is_punc("(")) {
                input.next();
                let exp = parse_expression();
                skip_punc(")");
                return exp;
            }
            if (is_punc("{")) return parse_prog();
            if (is_kw("let")) return parse_let();
            if (is_kw("if")) return parse_if();
            if (is_kw("true") || is_kw("false")) return parse_bool();
            if (is_kw("lambda") || is_kw("λ")) {
                input.next();
                return parse_lambda();
            }

            let tok = input.next();
            if (tok.type == "var" || tok.type == "num" || tok.type == "str")
                return tok;
            unexpected();
        });
    }
    function parse_toplevel() {
        let prog = [];
        while (!input.eof()) {
            prog.push(parse_expression());
            if (!input.eof()) skip_punc(";");
        }
        return { type: "prog", prog: prog };
    }
    function parse_prog() {
        let prog = delimited("{", "}", ";", parse_expression);
        if (prog.length == 0) return FALSE;
        if (prog.length == 1) return prog[0];
        return { type: "prog", prog: prog };
    }

    function parse_expression() {
        return maybe_call(() => {
            return maybe_binary(parse_atom(), 0);
        })
    }
}