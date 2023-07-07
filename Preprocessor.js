import { readFileSync } from "node:fs"

function clean_include(raw_include) {
    return raw_include.split("").filter(char => char !== '"' && char !== ';').join("");
}

function find_includes(program = "") {
    let incs = program.split("\n")
        .map(part => part.trim())
        .filter(e => e.startsWith("#!inc"))
        .map(e => e.slice(2, e.length - 1))
        .map(e => clean_include(e))
        .map(e => e.split(" "))
        .map(([t, v]) => ({ type: t, value: v }))
        .filter((incl) => incl.type === "inc");
    return incs.length !== 0 ? incs : null;
}

export default function Preprocess(prog) {
    let includes = find_includes(prog)
    if(!includes) return prog;
    
    let pre = "";
    for (const include of includes) {
        try {
            console.log(`Resolve include statement ${include.value}`);
            let content = readFileSync(include.value, "utf-8");
            pre += content + "\n";
        } catch(err) {
            console.warn(`Unable to find include ${include.value}.`)
        }
    }
    return pre + prog;
}