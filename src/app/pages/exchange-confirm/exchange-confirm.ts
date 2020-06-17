import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { ExchangeProvider } from 'src/app/services/exchange/exchange'

import { BrowserService } from 'src/app/services/browser/browser.service'

@Component({
  selector: 'page-exchange-confirm',
  templateUrl: 'exchange-confirm.html',
  styleUrls: ['./exchange-confirm.scss']
})
export class ExchangeConfirmPage {
  public activeExchange: string

  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet

  public fee: string
  public feeFiatAmount: string

  public amountExpectedFrom: number
  public amountExpectedTo: number

  public fromCurrency: string
  public toCurrency: string

  public fromFiatAmount: number
  public toFiatAmount: number

  public exchangeResult: any // | CreateTransactionResponse

  constructor(
    private readonly router: Router,
    private readonly exchangeProvider: ExchangeProvider,
    private readonly route: ActivatedRoute,
    private readonly operationsProvider: OperationsProvider,
    private readonly dataService: DataService,
    private readonly browserService: BrowserService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.fromWallet = info.fromWallet
      this.toWallet = info.toWallet
      this.fromCurrency = info.fromCurrency
      this.toCurrency = info.toCurrency
      this.exchangeResult = info.exchangeResult
      this.fee = info.fee

      this.amountExpectedFrom = this.exchangeResult.amountExpectedFrom ? this.exchangeResult.amountExpectedFrom : info.amountExpectedFrom
      this.amountExpectedTo = this.exchangeResult.amountExpectedTo ? this.exchangeResult.amountExpectedTo : info.amountExpectedTo

      this.feeFiatAmount = new BigNumber(this.fee).multipliedBy(this.fromWallet.currentMarketPrice).toString()
      this.fromFiatAmount = new BigNumber(this.amountExpectedFrom).multipliedBy(this.fromWallet.currentMarketPrice).toNumber()
      this.toFiatAmount = new BigNumber(this.amountExpectedTo).multipliedBy(this.toWallet.currentMarketPrice).toNumber()
    }

    this.exchangeProvider.getActiveExchange().subscribe(exchange => {
      this.activeExchange = exchange
    })
  }

  public async prepareTransaction() {
    const wallet = this.fromWallet
    const amount = new BigNumber(new BigNumber(this.amountExpectedFrom)).shiftedBy(wallet.protocol.decimals)
    const fee = new BigNumber(this.fee).shiftedBy(wallet.protocol.feeDecimals)

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

  public changellyUrl() {
    this.browserService.openUrl('https://old.changelly.com/aml-kyc')
  }

  public changeNowUrl() {
    this.browserService.openUrl('https://support.changenow.io/hc/en-us/articles/360011609979')
  }
}
