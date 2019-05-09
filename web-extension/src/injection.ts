import { Transactions } from './constants'
cleanContextForImports()
const Web3 = require('web3')
const ProviderEngine = require('web3-provider-engine')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js')
restoreContextAfterImports()

window.postMessage({ type: Transactions.ADDRESSES_REQUEST }, '*')
window.addEventListener('message', receiveAddress, false)

function receiveAddress(event) {
  if (event.data.type === Transactions.ADDRESSES_RESPONSE) {
    const addresses = event.data.addresses

    const engine = new ProviderEngine()

    engine.addProvider(
      new HookedWalletSubprovider({
        getAccounts(cb, params) {
          cb(undefined, [addresses])
        },
        signTransaction(cb) {
          const data = { type: Transactions.INCOMING_TRANSACTION, signTransaction: cb }
          window.postMessage(data, '*')
        }
      })
    )

    engine.addProvider(
      new RpcSubprovider({
        rpcUrl: 'https://mainnet.infura.io/'
      })
    )

    // network connectivity error
    engine.on('error', function(err) {
      // report connectivity errors
      console.error('connectivity:' + err.stack)
    })

    engine.start()

    const web3 = new Web3(engine)
    web3.currentProvider.setMaxListeners(100)
    ;(window as any).web3 = web3
    ;(window as any).Web3 = Web3
    // console.log('set proxied web3', (window as any).web3)
  }
}

// taken from metamask
// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
/* tslint:disable */
var __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports() {
  __define = (global as any).define
  try {
    ;(global as any).define = undefined
  } catch (_) {
    console.warn('AirGap - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports() {
  try {
    ;(global as any).define = __define
  } catch (_) {
    console.warn('AirGap - global.define could not be overwritten.')
  }
}
