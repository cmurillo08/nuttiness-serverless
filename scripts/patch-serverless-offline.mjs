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

const httpServerTarget = path.join(
  process.cwd(),
  "node_modules",
  "serverless-offline",
  "src",
  "events",
  "http",
  "HttpServer.js",
)

// --- Patch 2 (revised): parseCookies → response.header ---
// Root cause: hapi's request._states is keyed by cookie name (only one entry per name).
// When two Set-Cookie headers share the same name (e.g. a session cookie at Path=/
// and a legacy-clear cookie at Path=/api/v1/auth/), the second h.state() call
// overwrites the first and the browser receives an empty token → auth/me returns 401.
// Fix: bypass h.state() entirely and set the raw Set-Cookie header directly.
// hapi supports multiple set-cookie values as an array when appending.
if (!fs.existsSync(httpServerTarget)) {
  console.warn("[offline patch 2] HttpServer.js not found; skipping")
} else {
  const httpServerSource = fs.readFileSync(httpServerTarget, "utf8")

  // The target replacement (single-line body, no h.state)
  const fixedBody = `          response.header('set-cookie', headerValue, { append: true })`

  if (httpServerSource.includes(fixedBody)) {
    console.log("[offline patch 2] already applied: parseCookies uses response.header directly")
  } else {
    // Match either the original unpatched body or the previously partially-patched body
    const originalBody = `          const cookieName = headerValue.slice(0, headerValue.indexOf("="))
          const cookieValue = headerValue.slice(headerValue.indexOf("=") + 1)

          h.state(cookieName, cookieValue, {
            encoding: "none",
            strictHeader: false,
          })`

    const partiallyPatchedBody = `          const cookieName = headerValue.slice(0, headerValue.indexOf("="))
          const cookieValue = headerValue.slice(headerValue.indexOf("=") + 1).split(";")[0].trim()

          h.state(cookieName, cookieValue, {
            encoding: "none",
            strictHeader: false,
          })`

    if (httpServerSource.includes(partiallyPatchedBody)) {
      const patched = httpServerSource.replace(partiallyPatchedBody, fixedBody)
      fs.writeFileSync(httpServerTarget, patched, "utf8")
      console.log("[offline patch 2] applied: parseCookies → response.header (from partially patched state)")
    } else if (httpServerSource.includes(originalBody)) {
      const patched = httpServerSource.replace(originalBody, fixedBody)
      fs.writeFileSync(httpServerTarget, patched, "utf8")
      console.log("[offline patch 2] applied: parseCookies → response.header (from original state)")
    } else {
      console.warn("[offline patch 2] expected parseCookies pattern not found in HttpServer; skipping")
    }
  }
}
