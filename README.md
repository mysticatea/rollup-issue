# An issue of rollup.js

I tried to rollup the typescript language service (this will be run in a WebWorker) in [MonacoEditor] library, but it didn't finish in over 30 minutes.

I suspected it might dive into infinite looping because it was using a CPU core heavily with no warnings.

## Repro steps

1. `git clone https://github.com/mysticatea/rollup-issue.git`
1. `cd rollup-issue`
1. `npm install`
1. `npm test` (it runs `node_modules/.bin/rollup -c`)

The configuration file is simple:

```js
export default {
    input: require.resolve("monaco-editor/esm/vs/language/typescript/ts.worker.js"),
    output: {
        file: "dist/ts.worker.js",
        format: "iife",
        name: "tsWorker",
    }
}
```

[MonacoEditor]: https://github.com/Microsoft/monaco-editor
