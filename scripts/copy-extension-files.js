const fs = require('fs')
const FSP = require('fs').promises
const Path = require('path')

var rimraf = require('rimraf')

let copyExtensionFiles = async () => {
  async function copyDir(src, dest) {
    try {
      const entries = await FSP.readdir(src, { withFileTypes: true })

      try {
        await FSP.mkdir(dest)
      } catch (e) {
        // console.log('myerror: ' + e)
      }
      for (let entry of entries) {
        const srcPath = Path.join(src, entry.name)
        const destPath = Path.join(dest, entry.name)

        if (entry.isDirectory() && entry.name != 'node_modules') {
          try {
            await copyDir(srcPath, destPath)
          } catch (e) {
            // console.log('myerror: ' + e)
          }
        } else {
          if (srcPath.includes('www') && srcPath.includes('manifest.json')) {
            // console.log(srcPath)
          } else {
            try {
              await FSP.copyFile(srcPath, destPath)
            } catch (e) {
              // console.log('myerror: ' + e)
            }
          }
        }
      }
    } catch (e) {
      // console.log('myerror: ' + e)
    }
  }

  await copyDir('./www', './extension')
  await copyDir('./web-extension', './extension')
}

rimraf('./extension', function() {
  copyExtensionFiles().then(() => {
    const needle = `<script src="cordova.js"></script>`
    const css = `
		<style>
			html {
				min-width: 500px;
				min-height: 888px;
			}
			::-webkit-scrollbar {
				width: 0px;
				background: transparent;
			}
		</style>
		`

    // Inject chrome extension specific CSS to make window bigger
    const index = fs.readFileSync('./extension/index.html', { encoding: 'utf-8' })
    const indexWithCss = index.replace(needle, `${needle}\n${css}`)

    if (index === indexWithCss) {
      throw new Error('Could not inject extension css!')
    }

    fs.writeFileSync('./extension/index.html', indexWithCss)
  })
})
