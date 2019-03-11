import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { ExchangeProvider } from '../../providers/exchange/exchange'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { ExchangeConfirmPage } from '../exchange-confirm/exchange-confirm'

@Component({
  selector: 'page-exchange',
  templateUrl: 'exchange.html'
})
export class ExchangePage {
  public supportedProtocols: string[] = []
  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet
  public amount: string = '0.00001'
  public minExchangeAmount: string
  public exchangeAmount: string

  constructor(public navCtrl: NavController, public navParams: NavParams, private exchangeProvider: ExchangeProvider) {}

  async ngOnInit() {
    this.supportedProtocols = await this.exchangeProvider.getAvailableCurrencies()
  }

  async walletSelected(fromOrTo: string, wallet: AirGapMarketWallet) {
    if (fromOrTo === 'from') {
      this.fromWallet = wallet
    } else {
      this.toWallet = wallet
    }

    this.updateNumbers()
  }

  async amountSet(amount: string) {
    this.amount = amount

    this.updateNumbers()
  }

  async updateNumbers() {
    if (this.fromWallet && this.toWallet) {
      this.minExchangeAmount = await this.exchangeProvider.getMinAmountForCurrency(
        this.fromWallet.protocolIdentifier,
        this.toWallet.protocolIdentifier
      )
    }
    if (this.fromWallet && this.toWallet && this.amount) {
      this.exchangeAmount = await this.exchangeProvider.getExchangeAmount(
        this.fromWallet.protocolIdentifier,
        this.toWallet.protocolIdentifier,
        this.amount
      )
    }
    console.log(this.minExchangeAmount, this.exchangeAmount)
  }

  async startExchange() {
    try {
      /*
      const result = await this.exchangeProvider.createTransaction(
        this.fromWallet.protocolIdentifier,
        this.toWallet.protocolIdentifier,
        this.toWallet.receivingPublicAddress,
        this.amount
      )
*/
      // Sample response
      const result = {
        amountExpectedFrom: '1',
        amountExpectedTo: '28.114919',
        amountTo: 0,
        apiExtraFee: '0',
        changellyFee: '0.5',
        createdAt: '2019-03-07T15:04:19.000Z',
        currencyFrom: 'btc',
        currencyTo: 'eth',
        id: 'oy3n6t5n7moizfn4',
        kycRequired: false,
        payinAddress: '3QcdRcZf6y38TSas5qP4V49uwp5rokPLUn',
        payinExtraId: null,
        payoutAddress: '0xAEbF2f073d3FF1c510f2E79784848b3d8E4B1DEE',
        status: 'new'
      }

      this.navCtrl
        .push(ExchangeConfirmPage, {
          fromWallet: this.fromWallet,
          toWallet: this.toWallet,
          exchangeResult: result
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      console.log('result', result)
    } catch (error) {
      console.log(error)
      if (error.error.hasOwnProperty('code') && error.error.hasOwnProperty('message')) {
        console.log('code', error.error.code)
        console.log('message', error.error.message)
      }
    }
  }
}
