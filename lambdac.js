import parse from "./Parser.js";
import InputStream from "./InputStream.js";
import TokenStream from "./TokenStream.js";
import Preprocess from "./Preprocessor.js";

import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";
import { gzipSync } from "zlib";

const cryptBuffer =
    gzipSync(
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
        ), {memLevel: 9, windowBits: 15, level: 9}
    );

const cipherKey = ~~(Math.random() * 0xFF);
for (let idx = 1; idx < cryptBuffer.byteLength; idx++) {
    cryptBuffer[idx] ^= cipherKey;
    cryptBuffer[idx] %= 0xFFF;
    cryptBuffer[idx - 1] ^= cipherKey * idx + 1;
    cryptBuffer[idx - 1] %= 0xFFF;
}

writeFileSync(`${basename(process.argv[2]).split(".")[0]}.lcb`, Buffer.concat([Buffer.from("LCB"), cryptBuffer, Buffer.from([cipherKey])]), "binary");
