// cordova-plugin-qrscanner-11 sets the iOS camera preview orientation from
// UIApplication.shared.statusBarOrientation. With the UIScene life cycle that
// returns .unknown, which the plugin maps to .portraitUpsideDown, so the
// camera preview shows upside down. Read the orientation from the view's
// window scene instead, and treat an unknown orientation as portrait.

const fs = require('fs')
const path = require('path')

const swiftFile = path.join('node_modules/cordova-plugin-qrscanner-11/src/ios/QRScanner.swift')

const replacements = [
  [
    'interfaceOrientationToVideoOrientation(UIApplication.shared.statusBarOrientation)',
    'interfaceOrientationToVideoOrientation(self.window?.windowScene?.interfaceOrientation ?? UIInterfaceOrientation.portrait)'
  ],
  [/default:(\s*)return AVCaptureVideoOrientation\.portraitUpsideDown;/, 'default:$1return AVCaptureVideoOrientation.portrait;']
]

let source = fs.readFileSync(swiftFile, 'utf8')

for (const [from, to] of replacements) {
  const patched =
    typeof from === 'string' ? source.includes(to) : !from.test(source) && source.includes('return AVCaptureVideoOrientation.portrait;')
  if (patched) {
    continue
  }
  if (typeof from === 'string' ? !source.includes(from) : !from.test(source)) {
    throw new Error(`fix-qrscanner-orientation: pattern not found in ${swiftFile}: ${from}`)
  }
  source = source.replace(from, to)
}

fs.writeFileSync(swiftFile, source, 'utf8')
