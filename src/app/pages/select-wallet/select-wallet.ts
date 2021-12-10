import { AirGapMarketWallet, ProtocolSymbols } from '@airgap/coinlib-core'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'

import { AccountProvider } from '../../services/account/account.provider'
import { DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-select-wallet',
  templateUrl: 'select-wallet.html'
})
export class SelectWalletPage {
  public compatibleWallets: AirGapMarketWallet[] = []
  public incompatibleWallets: AirGapMarketWallet[] = []

  public descriptionKey: string

  private actionType: 'scanned-address' | 'fund-account' | 'broadcast'
  private targetIdentifier: ProtocolSymbols | undefined
  private address: string | undefined
  private callback: ((wallet: AirGapMarketWallet) => void) | undefined

  constructor(public accountProvider: AccountProvider, private readonly router: Router, private readonly route: ActivatedRoute) {}

  public async ionViewWillEnter() {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.actionType = info.actionType || 'scanned-address'
      this.targetIdentifier = info.targetIdentifier
      this.address = info.address
      this.compatibleWallets = info.compatibleWallets
      this.incompatibleWallets = info.incompatibleWallets
      this.callback = info.callback

      const descriptionTarget = this.targetIdentifier !== undefined ? `.${this.targetIdentifier}` : ''
      this.descriptionKey = `select-wallet.${this.actionType}${descriptionTarget}.text`
    }
  }

  public onSelected(wallet: AirGapMarketWallet) {
    if (this.callback !== undefined) {
      this.callback(wallet)
    } else if (this.address !== undefined) {
      this.openPreparePage(wallet)
    } else {
      throw new Error('Unknown behaviour')
    }
  }

  private openPreparePage(wallet: AirGapMarketWallet) {
    const info = {
      wallet,
      address: this.address
    }
    this.router
      .navigateByUrl(
        `/transaction-prepare/${DataServiceKey.TRANSACTION}/${info.wallet.publicKey}/${info.wallet.protocol.identifier}/${
          info.wallet.addressIndex
        }/${info.address}/${0}/undefined/${'not_forced'}`
      )
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
