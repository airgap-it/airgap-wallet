import { Transactions } from './constants'

declare let chrome
const height = 900
const width = 600

chrome.runtime.onMessage.addListener(async function(request) {
  if (request.data.type === Transactions.OUTGOING_TRANSACTION) {
    const rawUnsignedTx = request.data.signTransaction

    rawUnsignedTx.chainId = rawUnsignedTx.chainId || 1
    rawUnsignedTx.gasLimit = rawUnsignedTx.gas || `0x${(21000).toString(16)}`

    chrome.storage.local.get('selectedAccount', async function(storage) {
      const ethWallet = storage.selectedAccount
      const identifier = ethWallet.coinProtocol.identifier
      const publicKey = ethWallet.publicKey
      console.log('publicKey: ', ethWallet.ad)
      console.log('JSON.stringify(rawUnsignedTx): ', JSON.stringify(rawUnsignedTx))

      chrome.windows.create({
        url: `index.html?identifier=${identifier}&publicKey=${publicKey}&rawUnsignedTx=${JSON.stringify(rawUnsignedTx)}`,
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
  chrome.windows.create(
    {
      url: chrome.extension.getURL('html/request_camera.html')
    },
    function(tab) {
      console.log('TAB:')
      console.log(tab)
      // After the tab has been created, open a window to inject the tab
    }
  )
}
