export default {
    input: require.resolve("monaco-editor/esm/vs/language/typescript/ts.worker.js"),
    output: {
        file: "dist/ts.worker.js",
        format: "iife",
        name: "tsWorker",
    }
}
