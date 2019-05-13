import { Injectable } from '@angular/core'

import { AccountProvider } from './../account/account.provider'

// tslint:disable-next-line:no-any
declare let chrome: any
declare let window: Window & { chrome?: { runtime?: { id?: string } } } // TODO: add global this in TS 3.4

@Injectable({
  providedIn: 'root'
})
export class WebExtensionProvider {
  constructor(public accountProvider: AccountProvider) {
    this.accountProvider.refreshPageSubject.subscribe(() => {
      if (this.isWebExtension()) {
        this.refreshWindow()
      }
    })
  }

  public isWebExtension(): boolean {
    // Code running in a Chrome extension (content script, background page, etc.)
    return !!(window.chrome && chrome.runtime && chrome.runtime.id)
  }

  public refreshWindow(): void {
    chrome.tabs.getSelected(null, tab => {
      const code: string = 'window.location.reload()'
      chrome.tabs.executeScript(tab.id, { code })
    })
  }
}
