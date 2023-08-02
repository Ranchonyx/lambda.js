import { Execute, evaluate_continuation_passing } from "./Evaluator.js";
import { readFileSync } from "fs";
import basic_env from "./basic_env.js";
import { gunzipSync } from "zlib";

const contents = readFileSync(process.argv[2]);
if(!(contents.subarray(0, 3).toString("utf-8") === "LCB")) throw new Error("Invalid Binary Format!");
const blob = contents.subarray(3, contents.length-1);
const cipherKey = parseInt("0x"+contents.subarray(-1).toString("hex"));
console.log(cipherKey);
for(let idx = 1; idx < blob.byteLength; idx++) {
    blob[idx] ^= cipherKey;
    blob[idx] %= 0xFFF;
    blob[idx-1] ^= cipherKey * idx + 1;
    blob[idx-1] %= 0xFFF;
}

const AST = JSON.parse(gunzipSync(blob, {memLevel: 9, windowBits: 15, level: 9}));

Execute(100, evaluate_continuation_passing, [AST, basic_env, (result) => {
    console.log(`\n->\t${result}`);
    process.exit(result);
}]);