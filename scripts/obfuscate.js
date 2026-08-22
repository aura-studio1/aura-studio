const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const JavaScriptObfuscator = require('javascript-obfuscator');

const inputFile = path.join(__dirname, '../src/lib/patcher.ts');
const outputFile = path.join(__dirname, '../src/lib/patcher.obfuscated.js');

console.log('Reading TypeScript file:', inputFile);
const tsCode = fs.readFileSync(inputFile, 'utf8');

console.log('Compiling TypeScript to JavaScript...');
const result = ts.transpileModule(tsCode, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        removeComments: true,
    }
});

const jsCode = result.outputText;

console.log('Obfuscating JavaScript code...');
const obfuscationResult = JavaScriptObfuscator.obfuscate(jsCode, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    debugProtectionInterval: 4000,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 1,
    stringArrayEncoding: ['base64', 'rc4'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 5,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 5,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 1,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
});

console.log('Writing obfuscated code to:', outputFile);
fs.writeFileSync(outputFile, obfuscationResult.getObfuscatedCode());

console.log('Obfuscation complete!');
