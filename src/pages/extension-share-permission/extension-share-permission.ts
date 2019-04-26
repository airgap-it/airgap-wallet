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
    this.data = JSON.parse(this.navParams.get('data'))
    this.nextAction = this.navParams.get('nextAction')
  }

  async shareWallet() {
    this.webExtensionProvider.setSdkId(this.sdkId)
    await this.webExtensionProvider.postToContent({
      jsonrpc: '2.0',
      method: 'ae:walletDetail',
      params: [this.sdkId, this.navParams.get('address'), {}],
      id: 1,
      providerId: this.navParams.get('providerId')
    })
    this.dismiss()
  }

  public async prepareTransaction() {
    let wallet = JSON.parse(this.navParams.get('wallet'))
    let airGapWallet = new AirGapMarketWallet(
      wallet.protocolIdentifier,
      wallet.publicKey,
      wallet.isExtendedPublicKey,
      wallet.derivationPath,
      wallet.addressIndex
    )
    const amount = new BigNumber(this.navParams.get('amount'))
    const fee = new BigNumber(this.navParams.get('fee'))

    try {
      const { airGapTx, serializedTx } = await this.operationsProvider.prepareTransaction(
        airGapWallet,
        this.navParams.get('toAddress'),
        amount,
        fee
      )

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
