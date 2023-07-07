/*export function evaluate(expr, env) {
    switch (expr.type) {
        case "num":
        case "str":
        case "bool":
            return expr.value;
        case "var":
            return env.get(expr.value);
        case "let":
            expr.vars.forEach((v) => {
                let scope = env.extend();
                scope.def(v.name, v.def ? evaluate(v.def, env) : false);
                env = scope;
            });
            return evaluate(expr.body, env);
        case "assign":
            if (expr.left.type != "var") {
                throw new Error(`Cannot assign to ${JSON.stringify(expr.left, null, 2)}`)
            }
            return env.set(expr.left.value, evaluate(expr.right, env));
        case "binary":
            return apply_op(expr.operator, evaluate(expr.left, env), evaluate(expr.right, env));
        case "lambda":
            return make_lambda(env, expr);
        case "if":
            let condition = evaluate(expr.cond, env);
            if (condition !== false) return evaluate(expr.then, env);
            return expr.else ? evaluate(expr.else, env) : false;
        case "prog":
            let val = false;
            expr.prog.forEach((expr) => val = evaluate(expr, env));
            return val;
        case "call":
            let func = evaluate(expr.func, env);
            return func.apply(null, expr.args.map((arg) => evaluate(arg, env)));
        default:
            throw new Error(`Cannot evaluate ${expr.type}`);
    }

    function apply_op(op, a, b) {
        function num(x) {
            if (typeof x != "number") {
                throw new Error(`Expected number; Got ${x}`);
            }
            return x;
        }
        function div(x) {
            if (num(x) == 0) {
                throw new Error("Division by zero");
            }
            return x;
        }

        switch (op) {
            case "+": return num(a) + num(b);
            case "-": return num(a) - num(b);
            case "*": return num(a) * num(b);
            case "/": return num(a) / num(b);
            case "%": return num(a) % div(b);
            case "&&": return a !== false && b;
            case "||": return a !== false ? a : b;
            case "<": return num(a) < num(b);
            case ">": return num(a) > num(b);
            case "<=": return num(a) <= num(b);
            case ">=": return num(a) >= num(b);
            case "==": return a === b;
            case "!=": return a !== b;
        }
        throw new Error(`Cannot apply operator ${op}`);
    }

    function make_lambda(env, expr) {
        if (expr.name) {
            env = env.extend();
            env.def(expr.name, lambda);
        }

        function lambda() {
            let names = expr.vars;
            let scope = env.extend();
            for (let i = 0; i < names.length; i++) {
                scope.def(names[i], i < arguments.length ? arguments[i] : false);
            }
            return evaluate(expr.body, scope);
        }
        return lambda;
    }
}
*/
var MAX_STACK_GUARD_HITS_BEFORE_TERMINATION = 40000;
var STACK_GUARD_HITS = 0;
var STACKLEN = 100;
function GUARD(f, args) {
    if(--STACKLEN < 0) throw new Continuation(f, args);
}
export class Continuation {
    constructor(f, args) {
        this.f = f;
        this.args = args;
    }
}

export function Execute(stksz, f, args) {
    while(true) try {
        STACKLEN = stksz ?? 100;
        return f.apply(null, args);
    } catch(ex) {
        if(ex instanceof Continuation) {
            f = ex.f, args = ex.args;
            if(STACK_GUARD_HITS == MAX_STACK_GUARD_HITS_BEFORE_TERMINATION) {
                throw new Error("Maximum Stack guard hits reached, terminating.")
            }
        } else {
            throw ex;
        }
    }
}

export function evaluate_continuation_passing(expr, env, callback) {
    GUARD(evaluate_continuation_passing, arguments);
    switch (expr.type) {
        case "num":
        case "str":
        case "bool":
            callback(expr.value);
            return;
        case "var":
            callback(env.get(expr.value));
            return;
        case "assign":
            if (expr.left.type != "var") {
                throw new Error(`Cannot assign to ${JSON.stringify(expr.left, null, 2)}`);
            }
            evaluate_continuation_passing(expr.right, env, function CC(right) {
                GUARD(CC, arguments);
                callback(env.set(expr.left.value, right));
            })
            return;
        case "binary":
            evaluate_continuation_passing(expr.left, env, function CC(left) {
                GUARD(CC, arguments);
                evaluate_continuation_passing(expr.right, env, function CC(right) {
                    GUARD(CC, arguments);
                    callback(apply_op(expr.operator, left, right));
                });
            });
            return;
        case "let":
            (function loop(env, i) {
                GUARD(loop, arguments);
                if (i < expr.vars.length) {
                    let v = expr.vars[i];
                    if (v.def) evaluate_continuation_passing(v.def, env, function CC(value) {
                        GUARD(CC, arguments);
                        let scope = env.extend();
                        scope.def(v.name, value);
                        loop(scope, i + 1);
                    }); else {
                        let scope = env.extend();
                        scope.def(v.name, false);
                        loop(scope, i + 1);
                    }
                } else {
                    evaluate_continuation_passing(expr.body, env, callback);
                }
            })(env, 0);
            return;
        case "lambda":
            callback(make_lambda(env, expr));
            return;
        case "if":
            evaluate_continuation_passing(expr.cond, env, function CC(cond) {
                GUARD(CC, arguments);
                if (cond !== false) evaluate_continuation_passing(expr.then, env, callback);
                else if (expr.else) evaluate_continuation_passing(expr.else, env, callback);
                else callback(false);
            });
            return;
        case "prog":
            (function loop(last, i) {
                GUARD(loop, arguments);
                if (i < expr.prog.length) evaluate_continuation_passing(expr.prog[i], env, function CC(val) {
                    GUARD(CC, arguments);
                    loop(val, i + 1);
                }); else {
                    callback(last);
                }
            })(false, 0);
            return;
        case "call":
            evaluate_continuation_passing(expr.func, env, function CC(func) {
                GUARD(CC, arguments);
                (function loop(args, i) {
                    GUARD(loop, arguments);
                    if (i < expr.args.length) evaluate_continuation_passing(expr.args[i], env, function CC(arg) {
                        GUARD(CC, arguments);
                        args[i + 1] = arg;
                        loop(args, i + 1);
                    }); else {
                        func.apply(null, args);
                    }
                })([callback], 0)
            });
            return;
        default:
            throw new Error(`Cannot CPS evaluate ${expr.type}`);
    }
    function apply_op(op, a, b) {
        function num(x) {
            if (typeof x != "number") {
                throw new Error(`Expected number; Got ${x}`);
            }
            return x;
        }
        function div(x) {
            if (num(x) == 0) {
                throw new Error("Division by zero");
            }
            return x;
        }

        switch (op) {
            case "+": return num(a) + num(b);
            case "-": return num(a) - num(b);
            case "*": return num(a) * num(b);
            case "/": return num(a) / num(b);
            case "%": return num(a) % div(b);
            case "&&": return a !== false && b;
            case "||": return a !== false ? a : b;
            case "<": return num(a) < num(b);
            case ">": return num(a) > num(b);
            case "<=": return num(a) <= num(b);
            case ">=": return num(a) >= num(b);
            case "==": return a === b;
            case "!=": return a !== b;
        }
        throw new Error(`Cannot apply operator ${op}`);
    }

    function make_lambda(env, expr) {
        if (expr.name) {
            env = env.extend();
            env.def(expr.name, lambda);
        }

        function lambda(callback) {
            GUARD(lambda, arguments);
            let names = expr.vars;
            let scope = env.extend();
            for (let i = 0; i < names.length; ++i) {
                scope.def(names[i], i + 1 < arguments.length ? arguments[i + 1] : false);
            }
            evaluate_continuation_passing(expr.body, scope, callback);
        }
        return lambda;
    }
}