import Environment from "./Environment.js";
import * as readline from "node:readline"

import { readFile, writeFile } from "node:fs";
import { Execute, evaluate_continuation_passing } from "./Evaluator.js";

import parse from "./Parser.js";
import InputStream from "./InputStream.js";
import TokenStream from "./TokenStream.js";
import Preprocess from "./Preprocessor.js";


export default (() => {
    var lambda_env = new Environment();

    lambda_env.def("printf", (callback, fmt, anything) => {
        if (!anything) console.log(fmt);
        else console.log(fmt, anything)
        callback(false);
    });

    lambda_env.def("readline", async (k, len) => {
        let rStream = readline.createInterface(process.stdin, process.stdout);
        k(await new Promise((resolve) => {
            rStream.on("line", (input) => {
                resolve(input.slice(0, len));
            });
        }));
    });

    lambda_env.def("s0", 1321861022983091513n);
    lambda_env.def("s1", 3123198108391880477n);
    lambda_env.def("s2", 1451815097307991481n);
    lambda_env.def("s3", 5520930533486498032n);
    lambda_env.def("xoshiro_rand", (k, max) => {
        function xoshiro256() {
            function rotl(num, cnt) {
                return (BigInt(num) << BigInt(cnt)) | (BigInt(num)) >> (BigInt(64) - BigInt(cnt));
            }
            let s0 = lambda_env.get("s0");
            let s1 = lambda_env.get("s1"); // nicht alle vier mit 0 initialisieren
            let s2 = lambda_env.get("s2");
            let s3 = lambda_env.get("s3");

            const result = s0 + s3; // alternativ: result = rotl(s1 * 5, 7) * 9

            const t = s1 << 17n;
            s2 ^= s0;
            s3 ^= s1;
            s1 ^= s2;
            s0 ^= s3;
            s2 ^= t;
            s3 = rotl(s3, 45n);

            lambda_env.def("s0", s0);
            lambda_env.def("s1", s1);
            lambda_env.def("s2", s2);
            lambda_env.def("s3", s3);

            return parseInt(result);
        }

        if (!max) k(xoshiro256() % Number.MAX_SAFE_INTEGER);
        else k(xoshiro256() % max);
    });

    lambda_env.def("randFloat", (k) => {
        k(Math.random());
    });

    lambda_env.def("randInt", (k) => {
        k(Math.floor(Math.random()))
    })

    lambda_env.def("sleep", (k, ms) => {
        setTimeout(function () {
            Execute(100, k, [false]);
        }, ms);
    });

    lambda_env.def("fread", (k, filename, encoding) => {
        if (typeof encoding !== "string") encoding = "utf8"
        readFile(filename, encoding, (err, data) => {
            if (err) throw err;
            Execute(100, k, [data]);
        });
    });

    lambda_env.def("fwrite", (k, filename, data) => {
        writeFile(filename, data, (err) => {
            if (err) throw err;
            Execute(100, k, [false]);
        });
    });

    lambda_env.def("nfold", (k, ...args) => {
        for (let arg of args) {
            k(arg);
        }
    });

    lambda_env.def("cwcc", (k, f) => {
        f(k, (dicarded, ret) => {
            k(ret);
        })
    });

    lambda_env.def("eval", (k, contents) => {
        console.log(contents);
        const AST = parse(
            TokenStream(
                InputStream(
                    Preprocess(
                        contents
                    )
                )
            )
        )

        Execute(100, evaluate_continuation_passing, [AST, lambda_env, (result) => {
            k(result)
        }]);
    })

    return lambda_env;
})();