// remove types from coinlib local dependencies to avoid incompatibility errors

const fs = require('fs')
const path = require('path')

const rootdir = ''
const coreDependencies = path.join(rootdir, 'node_modules/@airgap/coinlib-core/dependencies/src')

const dependencies = [coreDependencies]

function removeTypes(path) {
  const isDirectory = fs.lstatSync(path).isDirectory()
  if (!isDirectory) {
    return
  }

  const files = fs.readdirSync(path)
  for (const file of files) {
    const absoluteFilePath = `${path}/${file}`
    if (file.endsWith('.d.ts')) {
      fs.rmSync(absoluteFilePath)
      console.log('Removed: ', absoluteFilePath)
    } else {
      removeTypes(absoluteFilePath)
    }
  }
}

console.log('patch-coinlib.js: Removing types from local dependencies')
dependencies.forEach((dir) => removeTypes(dir))