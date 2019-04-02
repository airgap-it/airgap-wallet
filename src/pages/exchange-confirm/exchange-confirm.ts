import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'
import { AirGapMarketWallet, EncodedType, SyncProtocolUtils } from 'airgap-coin-lib'
import { CreateTransactionResponse } from '../../providers/exchange/exchange'
import { InteractionSelectionPage } from '../interaction-selection/interaction-selection'
import { ErrorCategory, handleErrorSentry } from '../../providers/sentry-error-handler/sentry-error-handler'
import BigNumber from 'bignumber.js'
import { OperationsProvider } from '../../providers/operations/operations'
declare let cordova

@Component({
  selector: 'page-exchange-confirm',
  templateUrl: 'exchange-confirm.html'
})
export class ExchangeConfirmPage {
  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet
  public fee: BigNumber

  public fromFiatAmount: number
  public feeFiatAmount: number
  public toFiatAmount: number

  public exchangeResult: CreateTransactionResponse

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public platform: Platform,
    private operationsProvider: OperationsProvider
  ) {
    this.fromWallet = this.navParams.get('fromWallet')
    this.toWallet = this.navParams.get('toWallet')
    this.exchangeResult = this.navParams.get('exchangeResult')

    const fromAmount = new BigNumber(this.exchangeResult.amountExpectedFrom)
    const changellyFee = new BigNumber(this.exchangeResult.changellyFee)
    const apiExtraFee = new BigNumber(this.exchangeResult.apiExtraFee)
    const totalFeeInPercent = changellyFee.plus(apiExtraFee)
    const txFee = this.fromWallet.coinProtocol.feeDefaults.medium
    const exchangeTotalFee = fromAmount.multipliedBy(totalFeeInPercent.dividedBy(100))
    this.fee = exchangeTotalFee.plus(txFee)

    this.fromFiatAmount = new BigNumber(this.exchangeResult.amountExpectedFrom).multipliedBy(this.fromWallet.currentMarketPrice).toNumber()
    this.feeFiatAmount = this.fee.multipliedBy(this.fromWallet.currentMarketPrice).toNumber()
    this.toFiatAmount = new BigNumber(this.exchangeResult.amountExpectedTo).multipliedBy(this.toWallet.currentMarketPrice).toNumber()
  }

  public async prepareTransaction() {
    const wallet = this.fromWallet
    const amount = new BigNumber(new BigNumber(this.exchangeResult.amountExpectedFrom)).shiftedBy(wallet.coinProtocol.decimals)
    const fee = new BigNumber(this.fee).shiftedBy(wallet.coinProtocol.feeDecimals)

    try {
      const { airGapTx, serializedTx } = await this.operationsProvider.prepareTransaction(
        wallet,
        this.exchangeResult.payinAddress,
        amount,
        fee
      )

      this.navCtrl
        .push(InteractionSelectionPage, {
          wallet: wallet,
          airGapTx: airGapTx,
          data: 'airgap-vault://?d=' + serializedTx
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      //
    }
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
