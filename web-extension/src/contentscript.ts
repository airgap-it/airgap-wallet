import { toDataUrl } from 'myetherwallet-blockies'
import { Transactions } from './constants'
import ExtensionProvider from '@aeternity/aepp-sdk/es/provider/extension'
import Account from '@aeternity/aepp-sdk/es/account'

declare let chrome

function setupInjection() {
  let s = document.createElement('script')

  s.src = chrome.extension.getURL('dist/injection.js')
  ;(document.head || document.documentElement).appendChild(s)

  // otherwise injection rejected
  s.setAttribute('nonce', 'Nc3n83cnSAd3wc3Sasdfn939hc3')
}

setupInjection()

window.addEventListener('message', function(event) {
  // We only accept messages from ourselves
  if (event.source !== window) {
    return
  }
  if (event.data.type === Transactions.INCOMING_TRANSACTION) {
    // we got a transaction and have to prepare it, therefore we resend it to the background.js to create a new window etc. accordingly
    event.data.type = Transactions.OUTGOING_TRANSACTION
    chrome.runtime.sendMessage({ data: event.data }, function(response) {
      /* */
    })
  } else if (event.data.type === Transactions.ADDRESSES_REQUEST) {
    // inpage asks for the address

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
          let responseAddress = wallet.addresses[0]
          event.source.postMessage({ type: Transactions.ADDRESSES_RESPONSE, addresses: responseAddress }, event.origin)
        }
      })
    })
  }
})

// FOR AETERNITY AEPPS
// Subscribe from postMessages from page
const readyStateCheckInterval = setInterval(function() {
  if (document.readyState === 'complete') {
    clearInterval(readyStateCheckInterval)

    window.addEventListener(
      'message',
      ({ data }) => {
        // Handle message from page and redirect to background script
        chrome.runtime.sendMessage({ method: 'pageMessage', data })
      },
      false
    )

    // Handle message from background and redirect to page
    chrome.runtime.onMessage.addListener(({ data }, sender) => {
      window.postMessage(data, '*')
    })
  }
}, 10)
