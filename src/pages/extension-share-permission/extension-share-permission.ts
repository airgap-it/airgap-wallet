import { TransactionQrPage } from './../transaction-qr/transaction-qr'
import { OperationsProvider } from './../../providers/operations/operations'
import { WebExtensionProvider } from './../../providers/web-extension/web-extension'
import { ErrorCategory, handleErrorSentry } from './../../providers/sentry-error-handler/sentry-error-handler'
import { Component } from '@angular/core'
import { NavController, NavParams, ViewController } from 'ionic-angular'
import BigNumber from 'bignumber.js'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Component({
  selector: 'page-extension-share-permission',
  templateUrl: 'extension-share-permission.html'
})
export class ExtensionSharePermissionPage {
  private sdkId: any
  private address: any
  private providerId: any

  private rawWallet: any
  private toAddress: any
  private amount: any
  private fee: any
  private data: any

  private nextAction: any
  constructor(
    public navController: NavController,
    private viewController: ViewController,
    public navParams: NavParams,
    private webExtensionProvider: WebExtensionProvider,
    private operationsProvider: OperationsProvider
  ) {
    this.sdkId = this.navParams.get('sdkId')
    this.address = this.navParams.get('address')
    this.providerId = this.navParams.get('providerId')

    this.rawWallet = this.navParams.get('wallet')
    this.toAddress = this.navParams.get('toAddress')
    this.amount = this.navParams.get('amount')
    this.fee = this.navParams.get('fee')
    this.data = this.navParams.get('data')

    this.nextAction = this.navParams.get('nextAction')
    console.log('PERMISSIONS', this.nextAction)
  }

  async shareWallet() {
    console.log('shareWallet called')
    await this.webExtensionProvider.postToContent({
      jsonrpc: '2.0',
      method: 'ae:walletDetail',
      params: [this.sdkId, this.address, {}],
      id: 1,
      providerId: this.providerId
    })
    window.close()
  }

  public async prepareTransaction() {
    let wallet = JSON.parse(this.rawWallet)
    let airGapWallet = new AirGapMarketWallet(
      wallet.protocolIdentifier,
      wallet.publicKey,
      wallet.isExtendedPublicKey,
      wallet.derivationPath,
      wallet.addressIndex
    )
    const amount = new BigNumber(this.amount)
    const fee = new BigNumber(this.fee)

    try {
      const { airGapTx, serializedTx } = await this.operationsProvider.prepareTransaction(airGapWallet, this.toAddress, amount, fee)

      this.navController
        .push(TransactionQrPage, {
          wallet: airGapWallet,
          airGapTx: airGapTx,
          data: 'airgap-vault://?d=' + serializedTx
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      //
    }
  }

  public dismiss() {
    this.viewController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    window.close()
  }
}
