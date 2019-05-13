import { Transactions } from './constants'

declare let chrome

function setupInjection() {
  const s = document.createElement('script')

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
      const wallets = await result.wallets
      wallets.forEach(wallet => {
        if (wallet.publicKey === selectedAccount.publicKey && wallet.protocolIdentifier === selectedAccount.protocolIdentifier) {
          const responseAddress = wallet.addresses[0]
          ;(event.source as any).postMessage({ type: Transactions.ADDRESSES_RESPONSE, addresses: responseAddress }, event.origin)
        }
      })
    })
  }
})

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request.data)
})
