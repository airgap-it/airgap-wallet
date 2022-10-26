import { AirGapMarketWallet, IAirGapTransaction, UnsignedTransaction } from '@airgap/coinlib-core'
import { IACMessageType } from '@airgap/serializer'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import BigNumber from 'bignumber.js'

import { AccountProvider } from '../../services/account/account.provider'
import { BrowserService } from '../../services/browser/browser.service'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ExchangeProvider } from '../../services/exchange/exchange'
import { OperationsProvider } from '../../services/operations/operations'

@Component({
  selector: 'page-exchange-confirm',
  templateUrl: 'exchange-confirm.html',
  styleUrls: ['./exchange-confirm.scss']
})
export class ExchangeConfirmPage {
  public activeExchange: string

  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet

  public payoutAddress: string
  public payinAddress: string

  public fee: string
  public memo?: string
  public feeFiatAmount: string

  public amountExpectedFrom: number
  public amountExpectedTo: number

  public fromCurrency: string
  public toCurrency: string

  public fromFiatAmount: number
  public toFiatAmount: number

  public airGapTxs?: IAirGapTransaction[]
  public unsignedTransaction?: UnsignedTransaction

  constructor(
    private readonly exchangeProvider: ExchangeProvider,
    private readonly route: ActivatedRoute,
    private readonly operationsProvider: OperationsProvider,
    private readonly dataService: DataService,
    private readonly browserService: BrowserService,
    private readonly accountProvider: AccountProvider
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.fromWallet = info.fromWallet
      this.toWallet = info.toWallet
      this.fromCurrency = info.fromCurrency
      this.toCurrency = info.toCurrency
      this.payoutAddress = info.payoutAddress
      this.payinAddress = info.payinAddress
      this.fee = info.fee
      this.memo = info.memo
      this.airGapTxs = info.transaction?.details
      this.unsignedTransaction = info.transaction?.unsigned

      this.amountExpectedFrom = info.amountExpectedFrom
      this.amountExpectedTo = info.amountExpectedTo

      this.feeFiatAmount = new BigNumber(this.fee).multipliedBy(this.fromWallet.getCurrentMarketPrice()).toString()
      this.fromFiatAmount = new BigNumber(this.amountExpectedFrom).multipliedBy(this.fromWallet.getCurrentMarketPrice()).toNumber()
      this.toFiatAmount = new BigNumber(this.amountExpectedTo).multipliedBy(this.toWallet.getCurrentMarketPrice()).toNumber()
    }

    this.exchangeProvider.getActiveExchange().subscribe((exchange) => {
      this.activeExchange = exchange
    })
  }

  public async prepareTransaction() {
    try {
      const info = this.unsignedTransaction
        ? await this.getInteractionInfoFromUnsignedTransaction()
        : await this.prepareTransactionAndGetInteractionInfo()

      this.dataService.setData(DataServiceKey.INTERACTION, info)

      this.accountProvider.startInteraction(info.wallet, info.data, info.type, info.airGapTxs)
    } catch (error) {
      //
    }
  }

  private async getInteractionInfoFromUnsignedTransaction(): Promise<any> {
    const wallet: AirGapMarketWallet = this.fromWallet
    const airGapTxs: IAirGapTransaction[] = this.airGapTxs ?? (await wallet.protocol.getTransactionDetails(this.unsignedTransaction))

    return {
      wallet,
      airGapTxs,
      data: this.unsignedTransaction.transaction,
      type: IACMessageType.TransactionSignRequest
    }
  }

  private async prepareTransactionAndGetInteractionInfo(): Promise<any> {
    const wallet = this.fromWallet
    const amount = new BigNumber(new BigNumber(this.amountExpectedFrom)).shiftedBy(wallet.protocol.decimals)
    const fee = new BigNumber(this.fee).shiftedBy(wallet.protocol.feeDecimals)

    const { airGapTxs, unsignedTx } = await this.operationsProvider.prepareTransaction(
      wallet,
      this.payinAddress,
      amount,
      fee,
      this.accountProvider.getWalletList(),
      { memo: this.memo }
    )

    return {
      wallet,
      airGapTxs,
      data: unsignedTx,
      type: IACMessageType.TransactionSignRequest
    }
  }

  public changellyUrl() {
    this.browserService.openUrl('https://old.changelly.com/aml-kyc')
  }

  public changeNowUrl() {
    this.browserService.openUrl('https://support.changenow.io/hc/en-us/articles/360011609979')
  }
}
