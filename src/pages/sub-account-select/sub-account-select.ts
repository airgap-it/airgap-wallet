import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import {
  AirGapMarketWallet,
  ICoinProtocol,
  getProtocolByIdentifier,
  TezosKtProtocol,
  SyncProtocolUtils,
  EncodedType
} from 'airgap-coin-lib'
import { AccountProvider } from '../../providers/account/account.provider'
import { SubAccountProvider } from '../../providers/account/sub-account.provider'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../providers/operations/operations'

@Component({
  selector: 'page-sub-account-select',
  templateUrl: 'sub-account-select.html'
})
export class SubAccountSelectPage {
  private wallet: AirGapMarketWallet
  private protocolIdentifier: string
  public protocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private accountProvider: AccountProvider,
    private subAccountProvider: SubAccountProvider,
    private operationsProvider: OperationsProvider
  ) {
    this.subWallets = []
    this.wallet = this.navParams.get('wallet')

    this.subAccountProvider.wallets.subscribe(subWallets => {
      this.subWallets = subWallets.filter(subWallet => subWallet.publicKey === this.wallet.publicKey)
    })
  }

  async prepareDelegate() {
    const pageOptions = await this.operationsProvider.prepareDelegate(this.wallet, 'tz1YvE7Sfo92ueEPEdZceNWd5MWNeMNSt16L')

    this.navCtrl.push(pageOptions.page, pageOptions.params).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
