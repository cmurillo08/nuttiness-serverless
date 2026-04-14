import fs from "node:fs"
import path from "node:path"

const target = path.join(
  process.cwd(),
  "node_modules",
  "serverless-offline",
  "src",
  "lambda",
  "handler-runner",
  "python-runner",
  "PythonRunner.js",
)

if (!fs.existsSync(target)) {
  console.warn("[offline patch] serverless-offline not installed yet; skipping patch")
  process.exit(0)
}

const source = fs.readFileSync(target, "utf8")

if (source.includes("shell: false")) {
  console.log("[offline patch] already applied")
  process.exit(0)
}

if (!source.includes("shell: true")) {
  console.warn("[offline patch] expected pattern not found; skipping patch")
  process.exit(0)
}

const patched = source.replace("shell: true", "shell: false")
fs.writeFileSync(target, patched, "utf8")

console.log("[offline patch] applied: shell=true -> shell=false for PythonRunner")
