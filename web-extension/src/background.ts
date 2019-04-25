import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Transactions } from './constants'
import ExtensionProvider from '@aeternity/aepp-sdk/es/provider/extension'
import Account from '@aeternity/aepp-sdk/es/account'

declare let chrome
const height = 500
const width = 333
let providerId

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
      // we return the signedTx upon broadcasting the signedTx from the popup
      async sign(data) {
        chrome.runtime.onMessage.addListener((msg, sender) => {
          switch (msg.method) {
            case 'pageMessage':
              if (msg.data.signedTx && msg.method === 'signedTx') {
                return msg.data.signedTx
              }
              break
          }
        })
      },
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

function setProviderId(id: string) {
  providerId = id
}

function getProviderId() {
  return providerId
}

// Init extension stamp from sdk
ExtensionProvider({
  // Provide post function (default: window.postMessage)
  postFunction: postToContent,
  // By default `ExtensionProvider` use first account as default account. You can change active account using `selectAccount (address)` function
  accounts: accounts,

  // Hook for sdk registration, triggered by SDK
  // opens popup to ask for permission to share wallet
  onSdkRegister: async function(sdk) {
    const sdkId = sdk.sdkId
    const address = await this.address()
    chrome.windows.create({
      url: `notification.html?sdkId=${sdkId}&address=${address}&providerId=${getProviderId()}&nextAction=${'shareWallet'}&extensionSharePermissions=${true}`,
      type: 'popup',
      width,
      height
    })
  },

  // Hook for signing transaction, triggered by SDK

  /*
   * we open popup and ask for signing permission. Upon receiving permission,
   * we enter the prepareTransaction page. We scan the QR, sign it with the Vault
   * and scan the resulting QR with the extension. Now we can confirm that we wish to broadcast the transaction
   * Meanwhile we call sign() to listen for the broadcast confirmation
   */
  onSign: function({ sdkId, tx, txObject, sign }) {
    sign()
    chrome.storage.local.get('selectedAccount', async function(storage) {
      let airGapWallet = new AirGapMarketWallet(
        storage.selectedAccount.protocolIdentifier,
        storage.selectedAccount.publicKey,
        storage.selectedAccount.isExtendedPublicKey,
        storage.selectedAccount.derivationPath
      )
      const aeWallet = airGapWallet
      chrome.windows.create({
        url: `notification.html?wallet=${JSON.stringify(aeWallet)}&toAddress=${txObject.recipientId}&amount=${txObject.amount}&fee=${
          txObject.fee
        }&data=${JSON.stringify(txObject)}&nextAction=${'prepareTransaction'}&extensionSharePermissions=${true}`,
        type: 'popup',
        width,
        height
      })
      return true
    })
  },
  // Hook for broadcasting transaction result
  onBroadcast: function(sdk) {
    console.log('Brodcasting')
  }
})
  .then(provider => {
    console.log('created provider', provider)
    // Subscribe from postMessages from page
    chrome.runtime.onMessage.addListener((msg, sender) => {
      switch (msg.method) {
        case 'pageMessage':
          provider.processMessage(msg)
          if (msg.data.providerId) {
            // we have to forward the providerId to the popup later to allow for sharing the wallet information
            setProviderId(msg.data.providerId)
          }
          break
      }
    })
  })
  .catch(err => {
    console.error(err)
  })
