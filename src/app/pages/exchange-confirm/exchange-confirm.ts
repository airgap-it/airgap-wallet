import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
declare let cordova

@Component({
  selector: 'page-exchange-confirm',
  templateUrl: 'exchange-confirm.html',
  styleUrls: ['./exchange-confirm.scss']
})
export class ExchangeConfirmPage {
  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet
  public fee: BigNumber

  public amountExpectedFrom: number
  public amountExpectedTo: number

  public fromCurrency: string
  public toCurrency: string

  public fromFiatAmount: number
  public feeFiatAmount: number
  public toFiatAmount: number

  public exchangeResult: any // | CreateTransactionResponse

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    public platform: Platform,
    private readonly operationsProvider: OperationsProvider,
    private readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.fromWallet = info.fromWallet
      this.toWallet = info.toWallet
      this.fromCurrency = info.fromCurrency
      this.toCurrency = info.toCurrency
      this.toWallet
      this.exchangeResult = info.exchangeResult

      this.amountExpectedFrom = this.exchangeResult.amountExpectedFrom ? this.exchangeResult.amountExpectedFrom : info.amountExpectedFrom
      this.amountExpectedTo = this.exchangeResult.amountExpectedTo ? this.exchangeResult.amountExpectedTo : info.amountExpectedTo
    }
    const txFee = this.fromWallet.coinProtocol.feeDefaults.medium

    const fromAmount = new BigNumber(this.amountExpectedFrom)
    const changellyFee = this.exchangeResult.changellyFee ? new BigNumber(this.exchangeResult.changellyFee) : new BigNumber(0)
    const apiExtraFee = this.exchangeResult.apiExtraFee ? new BigNumber(this.exchangeResult.apiExtraFee) : new BigNumber(0)
    this.fromFiatAmount = new BigNumber(this.amountExpectedFrom).multipliedBy(this.fromWallet.currentMarketPrice).toNumber()
    this.toFiatAmount = new BigNumber(this.amountExpectedTo).multipliedBy(this.toWallet.currentMarketPrice).toNumber()

    if (changellyFee.eq(new BigNumber(0)) && apiExtraFee.eq(new BigNumber(0))) {
      const changeNowFiatFee = new BigNumber(this.fromFiatAmount).minus(new BigNumber(this.toFiatAmount)) // this is the fiat Value which has to be converted to the respective from unit
      const marketPrice = new BigNumber(this.fromWallet.currentMarketPrice)
      BigNumber.set({ DECIMAL_PLACES: 7 })
      this.fee = changeNowFiatFee.div(marketPrice)
    } else {
      const totalFeeInPercent = changellyFee.plus(apiExtraFee)
      const exchangeTotalFee = fromAmount.multipliedBy(totalFeeInPercent.dividedBy(100))
      this.fee = exchangeTotalFee.plus(txFee)
    }
    this.feeFiatAmount = this.fee.multipliedBy(this.fromWallet.currentMarketPrice).toNumber()
  }

  public async prepareTransaction() {
    const wallet = this.fromWallet
    const amount = new BigNumber(new BigNumber(this.amountExpectedFrom)).shiftedBy(wallet.coinProtocol.decimals)
    const fee = new BigNumber(this.fee).shiftedBy(wallet.coinProtocol.feeDecimals)

    try {
      const { airGapTxs, serializedTxChunks } = await this.operationsProvider.prepareTransaction(
        wallet,
        this.exchangeResult.payinAddress,
        amount,
        fee
      )

      const info = {
        wallet,
        airGapTxs,
        data: serializedTxChunks
      }

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
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
