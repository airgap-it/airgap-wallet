import { AirGapMarketWallet, SyncProtocolUtils, EncodedType } from 'airgap-coin-lib'
import { configureScope } from '@sentry/browser'
import { Transactions } from './constants'
import ExtensionProvider from '@aeternity/aepp-sdk/es/provider/extension'
import Account from '@aeternity/aepp-sdk/es/account'
import { resolve } from 'path'
import BigNumber from 'bignumber.js'

declare let chrome
const height = 500
const width = 333

chrome.runtime.onMessage.addListener(async function(request) {
  if (request.data.type === Transactions.OUTGOING_TRANSACTION) {
    let rawUnsignedTx = request.data.signTransaction

    rawUnsignedTx.chainId = rawUnsignedTx.chainId || 1
    rawUnsignedTx.gasLimit = rawUnsignedTx.gas || `0x${(21000).toString(16)}`

    chrome.storage.local.get('selectedAccount', async function(storage) {
      const ethWallet = storage.selectedAccount
      const identifier = ethWallet.coinProtocol.identifier
      const publicKey = ethWallet.publicKey
      console.log('publicKey: ', ethWallet.ad)
      console.log('JSON.stringify(rawUnsignedTx): ', JSON.stringify(rawUnsignedTx))

      chrome.windows.create({
        url: `notification.html?identifier=${identifier}&publicKey=${publicKey}&rawUnsignedTx=${JSON.stringify(rawUnsignedTx)}`,
        type: 'popup',
        width,
        height
      })
      /*
      chrome.windows.create({
        url: 'confirmation.html?payload=' + serializedTx,
        type: 'popup',
        width,
        height
      })
      */
      return true
    })
    return true
  }
})

chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.log('changes: ', changes)
  chrome.storage.sync.get(
    {
      profileId: 0
    },
    function(items) {
      // Update status bar text here
    }
  )
})

// otherwise the app has no camera permission!! Not possible to get camera permission differently.
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then(() => {
    console.log('ok')
  })
  .catch(error => {
    console.error(error)
    createWindow()
  })

function createWindow() {
  console.log('createWindow')
  chrome.windows.create(
    {
      url: chrome.runtime.getURL('../html/request_camera.html')
    },
    function(tab) {
      console.log('TAB:')
      console.log(tab)
      // After the tab has been created, open a window to inject the tab
    }
  )
}

// Init accounts
const accounts = [
  // You can add your own account implementation,
  Account.compose({
    init() {},
    methods: {
      /**
       * Sign data blob
       * @function sign
       * @instance
       * @abstract
       * @category async
       * @rtype (data: String) => data: Promise[String]
       * @param {String} data - Data blob to sign
       * @return {String} Signed data blob
       */
      async sign(data) {
        postToContent({
          jsonrpc: '2.0',
          method: 'ae:broadcast',
          params: ['1KGVZ2AFqAybJkpdKCzP/0W4W/0BQZaDH6en8g7VstQ=', 'raw_tx', 'signed_tx'],
          id: null
        })
        console.trace()
        console.log('we should sign data', data)
        chrome.storage.local.get('selectedAccount', async function(storage) {
          let airGapWallet = new AirGapMarketWallet(
            storage.selectedAccount.protocolIdentifier,
            storage.selectedAccount.publicKey,
            storage.selectedAccount.isExtendedPublicKey,
            storage.selectedAccount.derivationPath
          )
          const aeWallet = airGapWallet
          const values: any = [new BigNumber(data.amount)]
          const fee: any = new BigNumber(data.fee)
          console.log('values', values)
          console.log('fee', fee)
          console.log('storage.selectedAccount.publicKey', storage.selectedAccount.publicKey)

          // const rawUnsignedTx = await aeWallet.coinProtocol.prepareTransactionFromPublicKey(
          //   String(storage.selectedAccount.publicKey),
          //   ['ak_nv5B93FPzRHrGNmMdTDfGdd5xGZvep3MVSpJqzcQmMp59bBCv'],
          //   values,
          //   fee
          // )
          const rawUnsignedTx = {
            transaction:
              'tx_7WcPFuQ1mXzeHhN6jzxNUzz82bRN64RAocAamXGYuhV4NgQCF8tve1nGx8wm8XFy2UhkKzJ93LGXFtVZtYhVwgJBYRDNqztPA77dpdFx6fCs1gLJxBevJytJyJLns6AMNpbHR',
            networkId: 'ae_mainnet'
          }
          const identifier = aeWallet.coinProtocol.identifier
          const publicKey = aeWallet.publicKey

          chrome.windows.create({
            url: `notification.html?identifier=${identifier}&publicKey=${publicKey}&rawUnsignedTx=${JSON.stringify(rawUnsignedTx)}`,
            type: 'popup',
            width,
            height
          })
          /*
          chrome.windows.create({
            url: 'confirmation.html?payload=' + serializedTx,
            type: 'popup',
            width,
            height
          })
          */
          return true
        })
        // Send data to prepareTransactionScreen
        // return signedDataFromVault
      },
      /**
       * Obtain account address
       * @function address
       * @instance
       * @abstract
       * @category async
       * @rtype () => address: Promise[String]
       * @return {String} Public account address
       */
      // async address() {
      //   return 'ak_2dPGHd5dZgKwR234uqPZcAXXcCyxr3TbWwgV8NSnNincth4Lf7'
      // }

      async address() {
        return new Promise(resolve => {
          let selectedAccount
          chrome.storage.local.get('selectedAccount', function(result) {
            if (result) {
              selectedAccount = result.selectedAccount
            }
          })

          chrome.storage.local.get('wallets', async function(result) {
            let wallets = await result.wallets
            wallets.forEach(wallet => {
              if (wallet.publicKey === selectedAccount.publicKey && wallet.protocolIdentifier === selectedAccount.protocolIdentifier) {
                resolve(wallet.addresses[0])
              }
            })
          })
        })
      }
    }
  })()
]
const postToContent = data => {
  chrome.tabs.query({}, function(tabs) {
    // TODO think about direct communication with tab
    const message = { method: 'pageMessage', data }
    tabs.forEach(({ id }) => chrome.tabs.sendMessage(id, message)) // Send message to all tabs
  })
}

// Init extension stamp from sdk
ExtensionProvider({
  // Provide post function (default: window.postMessage)
  postFunction: postToContent,
  // By default `ExtesionProvider` use first account as default account. You can change active account using `selectAccount (address)` function
  accounts: accounts,
  // Hook for sdk registration
  onSdkRegister: function(sdk) {
    console.log('SDK', sdk)
    // sendDataToPopup(this.getSdks())
    // createWindow()
    if (confirm('Do you want to share wallet with sdk ' + sdk.sdkId)) sdk.shareWallet() // SHARE WALLET WITH SDK
  },
  // Hook for signing transaction
  onSign: function({ sdkId, tx, txObject, sign }) {
    // sendDataToPopup(this.getSdks())
    if (confirm('Do you want to sign ' + JSON.stringify(txObject) + ' ?')) {
      console.log('txObject', txObject)
      accounts[0].sign(txObject)
    } // SIGN TX
  },
  // Hook for broadcasting transaction result
  onBroadcast: function(sdk) {
    console.log('Brodcasting')
  }
})
  .then(provider => {
    console.log('created provider')
    // Subscribe from postMessages from page
    chrome.runtime.onMessage.addListener((msg, sender) => {
      console.log('msg: ', msg)
      switch (msg.method) {
        case 'pageMessage':
          provider.processMessage(msg)
          break
      }
    })
  })
  .catch(err => {
    console.error(err)
  })
