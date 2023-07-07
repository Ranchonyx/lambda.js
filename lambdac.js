import parse from "./Parser.js";
import InputStream from "./InputStream.js";
import TokenStream from "./TokenStream.js";
import Preprocess from "./Preprocessor.js";

import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";
import { serialize } from "v8";

const cryptBuffer = Buffer.from(
    JSON.stringify(
        parse(
            TokenStream(
                InputStream(
                    Preprocess(
                        readFileSync(process.argv[2], "utf-8")
                    )
                )
            )
        )
        , null, 2));

for (let key = 1; key < cryptBuffer.byteLength; key++) {
    cryptBuffer[key] ^= key;
    cryptBuffer[key] %= 0xFFF;
    cryptBuffer[key-1] ^= key * key + 1;
    cryptBuffer[key-1] %= 0xFFF;
}
writeFileSync(`${basename(process.argv[2]).split(".")[0]}.lcb`, serialize(cryptBuffer), "binary");