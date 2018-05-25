import fs from "fs"
import path from "path"
import resolve from "rollup-plugin-node-resolve"

const css = {
    load(id) {
        if (path.extname(id) !== ".css") {
            return null
        }

        const content = fs.readFileSync(id, "utf8")
        const relativePath = path
            .relative(process.cwd(), id)
            .replace(/\\/g, "/")
            .replace("node_modules/", "")

        return `// ${relativePath}
const element = document.createElement("style");
element.textContent = ${JSON.stringify(content)};
document.head.appendChild(element);
`
    },
}

export default [
    {
        input: require.resolve("monaco-editor/esm/vs/editor/editor.worker.js"),
        onwarn() {
            // ignore.
        },
        output: {
            file: "dist/editor.worker.js",
            format: "iife",
            name: "editorWorker",
        },
    },
    {
        input: require.resolve("monaco-editor/esm/vs/language/typescript/ts.worker.js"),
        onwarn() {
            // ignore.
        },
        output: {
            file: "dist/ts.worker.js",
            format: "iife",
            name: "tsWorker",
        },
    },
    {
        experimentalDynamicImport: true,
        input: "src/monaco-editor.js",
        onwarn() {
            // ignore.
        },
        output: {
            file: "dist/index.js",
            format: "iife",
            name: "monaco",
        },
        plugins: [resolve(), css],
    },
]
