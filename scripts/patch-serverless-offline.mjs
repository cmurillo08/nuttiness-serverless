import fs from "node:fs"
import path from "node:path"

// --- Patch 1: PythonRunner shell:true ---
// serverless-offline uses shell:true which breaks paths with spaces (e.g. "Personal Projects")
const pythonRunnerTarget = path.join(
  process.cwd(),
  "node_modules",
  "serverless-offline",
  "src",
  "lambda",
  "handler-runner",
  "python-runner",
  "PythonRunner.js",
)

if (!fs.existsSync(pythonRunnerTarget)) {
  console.warn("[offline patch] serverless-offline not installed yet; skipping patch")
  process.exit(0)
}

const pythonRunnerSource = fs.readFileSync(pythonRunnerTarget, "utf8")

if (pythonRunnerSource.includes("shell: false")) {
  console.log("[offline patch 1] already applied: PythonRunner shell fix")
} else if (!pythonRunnerSource.includes("shell: true")) {
  console.warn("[offline patch 1] expected pattern not found in PythonRunner; skipping")
} else {
  const patched = pythonRunnerSource.replace("shell: true", "shell: false")
  fs.writeFileSync(pythonRunnerTarget, patched, "utf8")
  console.log("[offline patch 1] applied: shell=true -> shell=false in PythonRunner")
}

// --- Patch 2: HttpServer parseCookies ---
// serverless-offline's parseCookies passes the full Set-Cookie value (e.g.
// "TOKEN; Path=/; HttpOnly; SameSite=Lax") to hapi's h.state(), which calls
// @hapi/statehood and rejects the ';' character as an invalid cookie value char.
// Fix: extract only the token (the part before the first ';') as the cookie value.
const httpServerTarget = path.join(
  process.cwd(),
  "node_modules",
  "serverless-offline",
  "src",
  "events",
  "http",
  "HttpServer.js",
)

if (!fs.existsSync(httpServerTarget)) {
  console.warn("[offline patch 2] HttpServer.js not found; skipping")
} else {
  const httpServerSource = fs.readFileSync(httpServerTarget, "utf8")
  const buggyPattern = `const cookieValue = headerValue.slice(headerValue.indexOf("=") + 1)`
  const fixedPattern = `const cookieValue = headerValue.slice(headerValue.indexOf("=") + 1).split(";")[0].trim()`

  if (httpServerSource.includes(fixedPattern)) {
    console.log("[offline patch 2] already applied: HttpServer parseCookies fix")
  } else if (!httpServerSource.includes(buggyPattern)) {
    console.warn("[offline patch 2] expected pattern not found in HttpServer; skipping")
  } else {
    const patched = httpServerSource.replace(buggyPattern, fixedPattern)
    fs.writeFileSync(httpServerTarget, patched, "utf8")
    console.log("[offline patch 2] applied: parseCookies strips cookie attributes before h.state()")
  }
}
