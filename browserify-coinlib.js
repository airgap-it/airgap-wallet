const fs = require('fs')
const path = require('path')

const browserify = require('browserify')
const esmify = require('esmify')

const rootdir = './'
const assetsdir = path.join(rootdir, 'src/assets')
const modules = [
  {
    import: '../../../node_modules/@airgap/coinlib-core'
  },
  {
    namespace: 'aeternity',
    import: '../../../node_modules/@airgap/aeternity'
  },
  {
    namespace: 'astar',
    import: '../../../node_modules/@airgap/astar'
  },
  {
    namespace: 'bitcoin',
    import: '../../../node_modules/@airgap/bitcoin'
  },
  {
    namespace: 'coreum',
    import: '../../../node_modules/@airgap/coreum'
  },
  {
    namespace: 'cosmos',
    import: '../../../node_modules/@airgap/cosmos'
  },
  {
    namespace: 'ethereum',
    import: '../../../node_modules/@airgap/ethereum'
  },
  {
    namespace: 'groestlcoin',
    import: '../../../node_modules/@airgap/groestlcoin'
  },
  {
    namespace: 'icp',
    import: '../../../node_modules/@airgap/icp'
  },
  {
    namespace: 'moonbeam',
    import: '../../../node_modules/@airgap/moonbeam'
  },
  {
    namespace: 'optimism',
    import: '../../../node_modules/@airgap/optimism'
  },
  {
    namespace: 'polkadot',
    import: '../../../node_modules/@airgap/polkadot'
  },
  {
    namespace: 'tezos',
    import: '../../../node_modules/@airgap/tezos'
  }
]

function browserifyModules(modules) {
  const outputDir = path.join(assetsdir, `libs`)
  const combinedSourceFile = 'coinlib-all.js'
  const combinedSource = modules.map((module) => 
    module.namespace
      ? `import * as ${module.namespace} from '${module.import}';\nexport { ${module.namespace} };`
      : `export * from '${module.import}';`
  ).join('\n')

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, combinedSourceFile), combinedSource, 'utf-8')

  browserify(`${outputDir}/${combinedSourceFile}`, { standalone: 'airgapCoinLib' })
    .plugin(esmify)
    .bundle()
    .pipe(fs.createWriteStream(path.join(outputDir, 'airgap-coin-lib.browserify.js')))
}


browserifyModules(modules)