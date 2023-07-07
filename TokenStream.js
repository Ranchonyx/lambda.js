export default function TokenStream(input) {
    var current = null;
    var keywords = " let if then else lambda λ true false ";
    return {
        next: next,
        peek: peek,
        eof: eof,
        croak: input.croak
    };
    function is_keyword(x) {
        return keywords.indexOf(` ${x} `) >= 0;
    }
    function is_digit(ch) {
        return /[0-9]/i.test(ch);
    }
    function is_ident_start(ch) {
        return /[a-zλ_]/i.test(ch);
    }
    function is_ident(ch) {
        return is_ident_start(ch) || "?!-<>=0123456789".indexOf(ch) >= 0;
    }
    function is_op_char(ch) {
        return "+-*/%=&|<>!".indexOf(ch) >= 0;
    }
    function is_punc(ch) {
        return ",;(){}[]".indexOf(ch) >= 0;
    }
    function is_whitespace(ch) {
        return " \t\r\n".indexOf(ch) >= 0;
    }
    function read_while(predicate) {
        let str = "";
        while (!input.eof() && predicate(input.peek())) {
            str += input.next();
        }
        return str;
    }
    function read_number() {
        let has_dot = false;
        let number = read_while((ch) => {
            if (ch === ".") {
                if (has_dot) return false;
                has_dot = true;
                return true;
            }
            return is_digit(ch);
        });
        console.log(`Read number: ${parseFloat(number)}`);
        return { type: "num", value: parseFloat(number) }
    }
    function read_ident() {
        let id = read_while(is_ident);
        console.log(`Read identifier: ${id}`)
        return {
            type: is_keyword(id) ? "kw" : "var",
            value: id
        };
    }
    function read_escaped(end) {
        let escaped = false, str = "";
        input.next();
        while (!input.eof()) {
            let ch = input.next();
            if (escaped) {
                str += ch;
                escaped = false;
            } else if (ch == "\\") {
                escaped = true;
            } else if (ch == end) {
                break;
            } else {
                str += ch;
            }
        }
        return str;
    }
    function read_string() {
        let val = read_escaped('"');
        console.log(`Read string: ${val}`);

        return { type: "str", value: val};
    }
    function skip_comment() {
        read_while((ch) => ch != "\n");
        console.log("Skipping comment")
        input.next();
    }
    function read_next() {
        read_while(is_whitespace);
        if (input.eof()) return null;

        let ch = input.peek();

        if (ch === "#") {
            skip_comment();
            return read_next();
        }

        if (ch == '"') return read_string();
        if (is_digit(ch)) return read_number();
        if (is_ident_start(ch)) return read_ident();
        if (is_punc(ch)) return {
            type: "punc",
            value: input.next()
        }
        if (is_op_char(ch)) return {
            type: "op",
            value: read_while(is_op_char)
        }
        input.croak(`Can't handle character: ${ch}`);
    }

    function peek() {
        return current || (current = read_next());
    }
    function next() {
        let tok = current;
        current = null;
        return tok || read_next();
    }
    function eof() {
        return peek() === null;
    }
}