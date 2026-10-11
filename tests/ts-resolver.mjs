// Test-only module hooks: lets `node --test` load the app's TypeScript
// sources directly (transpiled with the repo's own typescript) by resolving the "@/..." alias and
// extensionless relative imports the same way tsconfig/Next do.
import { register } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith("@/")) {
        target = path.join(root, specifier.slice(2));
    } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) {
        target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (target) {
        for (const candidate of [`${target}.ts`, `${target}.tsx`, path.join(target, "index.ts")]) {
            if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
        }
    }
    try {
        return await nextResolve(specifier, context);
    } catch (error) {
        // CJS packages without an exports map (e.g. next/server) need the
        // explicit .js that bundlers add for us.
        if (error.code === "ERR_MODULE_NOT_FOUND" && !specifier.startsWith(".") && !path.extname(specifier)) {
            return nextResolve(`${specifier}.js`, context);
        }
        throw error;
    }
}

export async function load(url, context, nextLoad) {
    if (!/.tsx?$/.test(url)) return nextLoad(url, context);
    const { outputText } = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    return { format: "module", source: outputText, shortCircuit: true };
}

if (!globalThis.__tsResolverRegistered) {
    globalThis.__tsResolverRegistered = true;
    register(import.meta.url);
}
