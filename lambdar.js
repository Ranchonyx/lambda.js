import { Execute, evaluate_continuation_passing } from "./Evaluator.js";
import { readFileSync } from "fs";
import { deserialize } from "v8";
import basic_env from "./basic_env.js";

let blob = deserialize(readFileSync(process.argv[2]));
for(let key = 1; key < blob.byteLength; key++) {
    blob[key] ^= key;
    blob[key] %= 0xFFF;
    blob[key-1] ^= key * key + 1;
    blob[key-1] %= 0xFFF;
}
const AST = JSON.parse(blob);

Execute(100, evaluate_continuation_passing, [AST, basic_env, (result) => {
    console.log(`\n->\t${result}`);
    process.exit(result);
}]);