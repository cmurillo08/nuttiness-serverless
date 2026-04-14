const major = Number(process.versions.node.split(".")[0])

if (Number.isNaN(major) || major < 20) {
  console.error("Node 20+ is required for the frontend dependencies in this project.")
  console.error(`Current Node version: ${process.versions.node}`)
  console.error("Use nvm: nvm install 20 && nvm use 20")
  process.exit(1)
}

console.log(`Node version OK: ${process.versions.node}`)
