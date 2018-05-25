import "monaco-editor/esm/vs/editor/browser/controller/coreCommands"
import "monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget"
import "monaco-editor/esm/vs/editor/contrib/bracketMatching/bracketMatching"
import "monaco-editor/esm/vs/editor/contrib/caretOperations/caretOperations"
import "monaco-editor/esm/vs/editor/contrib/caretOperations/transpose"
import "monaco-editor/esm/vs/editor/contrib/clipboard/clipboard"
import "monaco-editor/esm/vs/editor/contrib/comment/comment"
import "monaco-editor/esm/vs/editor/contrib/contextmenu/contextmenu"
import "monaco-editor/esm/vs/editor/contrib/find/findController"
import "monaco-editor/esm/vs/editor/contrib/folding/folding"
import "monaco-editor/esm/vs/editor/contrib/format/formatActions"
import "monaco-editor/esm/vs/editor/contrib/gotoError/gotoError"
import "monaco-editor/esm/vs/editor/contrib/hover/hover"
import "monaco-editor/esm/vs/editor/contrib/inPlaceReplace/inPlaceReplace"
import "monaco-editor/esm/vs/editor/contrib/linesOperations/linesOperations"
import "monaco-editor/esm/vs/editor/contrib/smartSelect/smartSelect"
import "monaco-editor/esm/vs/editor/contrib/suggest/suggestController"
import "monaco-editor/esm/vs/editor/contrib/wordHighlighter/wordHighlighter"
import "monaco-editor/esm/vs/editor/contrib/wordOperations/wordOperations"
import "monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp"
import "monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens"
import "monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard"
import "monaco-editor/esm/vs/editor/standalone/browser/quickOpen/quickOutline.js"
import "monaco-editor/esm/vs/editor/standalone/browser/quickOpen/gotoLine.js"
import "monaco-editor/esm/vs/editor/standalone/browser/quickOpen/quickCommand.js"
import * as monaco from "monaco-editor/esm/vs/editor/editor.api"

import "monaco-editor/esm/vs/language/typescript/monaco.contribution"

const workerURL = {
    javascript: "./ts.worker.js",
    get typescript() {
        return this.javascript
    },
}
Object.setPrototypeOf(workerURL, null)

/*globals window */
window.MonacoEnvironment = {
    getWorkerUrl: (_, label) => workerURL[label] || "./editor.worker.js",
}

const element = document.getElementById('editor')
element.textContent = ""
monaco.editor.create(element, {
    value: "import fs from \"fs\"\nimport path from \"path\"\nimport resolve from \"rollup-plugin-node-resolve\"\n\nconst css = {\n    load(id) {\n        if (path.extname(id) !== \".css\") {\n            return null\n        }\n\n        const content = fs.readFileSync(id, \"utf8\")\n        const relativePath = path\n            .relative(process.cwd(), id)\n            .replace(/\\\\/g, \"/\")\n            .replace(\"node_modules/\", \"\")\n\n        return `// ${relativePath}\nconst element = document.createElement(\"style\");\nelement.textContent = ${JSON.stringify(content)};\ndocument.head.appendChild(element);\n`\n    },\n}\n\nexport default [\n    {\n        input: require.resolve(\"monaco-editor/esm/vs/editor/editor.worker.js\"),\n        onwarn() {\n            // ignore.\n        },\n        output: {\n            file: \"dist/editor.worker.js\",\n            format: \"iife\",\n            name: \"editorWorker\",\n        },\n    },\n    {\n        input: require.resolve(\"monaco-editor/esm/vs/language/typescript/ts.worker.js\"),\n        onwarn() {\n            // ignore.\n        },\n        output: {\n            file: \"dist/ts.worker.js\",\n            format: \"iife\",\n            name: \"tsWorker\",\n        },\n    },\n    {\n        experimentalDynamicImport: true,\n        input: \"src/monaco-editor.js\",\n        onwarn() {\n            // ignore.\n        },\n        output: {\n            file: \"dist/index.js\",\n            format: \"iife\",\n            name: \"monaco\",\n        },\n        plugins: [resolve(), css],\n    },\n]\n",
    language: 'javascript'
});
