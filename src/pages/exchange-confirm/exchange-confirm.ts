import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'
import { AirGapMarketWallet, EncodedType, SyncProtocolUtils } from 'airgap-coin-lib'
import { CreateTransactionResponse } from '../../providers/exchange/exchange'
import { InteractionSelectionPage } from '../interaction-selection/interaction-selection'
import { ErrorCategory, handleErrorSentry } from '../../providers/sentry-error-handler/sentry-error-handler'
import BigNumber from 'bignumber.js'
declare let cordova

@Component({
  selector: 'page-exchange-confirm',
  templateUrl: 'exchange-confirm.html'
})
export class ExchangeConfirmPage {
  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet
  public fee: BigNumber
  public exchangeResult: CreateTransactionResponse

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform) {
    this.fromWallet = this.navParams.get('fromWallet')
    this.toWallet = this.navParams.get('toWallet')
    this.exchangeResult = this.navParams.get('exchangeResult')
    this.fee = this.fromWallet.coinProtocol.feeDefaults.medium
  }

  public async prepareTransaction() {
    const wallet = this.fromWallet
    const amount = new BigNumber(new BigNumber(this.exchangeResult.amountExpectedFrom)).shiftedBy(wallet.coinProtocol.decimals)
    const fee = new BigNumber(this.fee).shiftedBy(wallet.coinProtocol.feeDecimals)
    const rawUnsignedTx: any = await wallet.prepareTransaction([this.exchangeResult.payinAddress], [amount], fee)

    const airGapTx = await wallet.coinProtocol.getTransactionDetails({
      publicKey: wallet.publicKey,
      transaction: rawUnsignedTx
    })

    const syncProtocol = new SyncProtocolUtils()
    const serializedTx = await syncProtocol.serialize({
      version: 1,
      protocol: wallet.coinProtocol.identifier,
      type: EncodedType.UNSIGNED_TRANSACTION,
      payload: {
        publicKey: wallet.publicKey,
        transaction: rawUnsignedTx,
        callback: 'airgap-wallet://?d='
      }
    })

    this.navCtrl
      .push(InteractionSelectionPage, {
        wallet: wallet,
        airGapTx: airGapTx,
        data: 'airgap-vault://?d=' + serializedTx
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  public changellyUrl() {
    this.openUrl('https://old.changelly.com/aml-kyc')
  }
}
