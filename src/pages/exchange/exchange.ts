import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { ExchangeProvider } from '../../providers/exchange/exchange'
import { AirGapMarketWallet, ICoinProtocol, getProtocolByIdentifier } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { ExchangeConfirmPage } from '../exchange-confirm/exchange-confirm'
import { StorageProvider, SettingsKey } from '../../providers/storage/storage'
import { AccountProvider } from '../../providers/account/account.provider'
import { BigNumber } from 'bignumber.js'

enum ExchangePageState {
  LOADING,
  ONBOARDING,
  ONLY_ONE_CURRENCY,
  EXCHANGE
}

@Component({
  selector: 'page-exchange',
  templateUrl: 'exchange.html'
})
export class ExchangePage {
  public selectedFromProtocol: ICoinProtocol
  public selectedToProtocol: ICoinProtocol
  public supportedProtocolsFrom: string[] = []
  public supportedProtocolsTo: string[] = []
  public fromWallet: AirGapMarketWallet
  public supportedFromWallets: AirGapMarketWallet[]
  public toWallet: AirGapMarketWallet
  public supportedToWallets: AirGapMarketWallet[]
  public amount: BigNumber = new BigNumber('0.00001')
  public minExchangeAmount: string
  public exchangeAmount: BigNumber

  public exchangePageStates = ExchangePageState
  public exchangePageState: ExchangePageState = ExchangePageState.LOADING

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private exchangeProvider: ExchangeProvider,
    private storageProvider: StorageProvider,
    private accountProvider: AccountProvider
  ) {
    this.storageProvider
      .get(SettingsKey.EXCHANGE_INTEGRATION)
      .then(value => {
        this.exchangePageState = value === null ? ExchangePageState.ONBOARDING : ExchangePageState.EXCHANGE
      })
      .catch(handleErrorSentry(ErrorCategory.STORAGE))
  }

  async ngOnInit() {
    this.initExchangePage()
  }

  public async initExchangePage() {
    this.supportedProtocolsFrom = await this.exchangeProvider.getAvailableFromCurrencies() // TODO: Filter for wallets we have
    this.protocolSet('from', getProtocolByIdentifier(this.supportedProtocolsFrom[0]))
  }

  async protocolSet(fromOrTo: string, protocol: ICoinProtocol) {
    if (fromOrTo === 'from') {
      this.selectedFromProtocol = protocol

      if (!this.selectedToProtocol || this.selectedFromProtocol.identifier === this.selectedToProtocol.identifier) {
        this.supportedProtocolsTo = await this.exchangeProvider.getAvailableToCurrenciesForCurrency(this.selectedFromProtocol.identifier) // TODO: Filter for wallets we have
        this.protocolSet('to', getProtocolByIdentifier(this.supportedProtocolsTo[0]))
      }
    } else {
      this.selectedToProtocol = protocol
    }

    await this.loadWalletsForSelectedProtocol(fromOrTo)

    console.log('new protocol selected!')
    this.loadDataFromExchange()
  }

  async loadWalletsForSelectedProtocol(fromOrTo: string) {
    if (fromOrTo === 'from') {
      this.supportedFromWallets = this.accountProvider
        .getWalletList()
        .filter(wallet => wallet.protocolIdentifier === this.selectedFromProtocol.identifier)
      this.fromWallet = this.supportedFromWallets[0]
    } else {
      this.supportedToWallets = this.accountProvider
        .getWalletList()
        .filter(wallet => wallet.protocolIdentifier === this.selectedToProtocol.identifier)
      this.toWallet = this.supportedToWallets[0]
    }
  }

  async walletSet(fromOrTo: string, wallet: AirGapMarketWallet) {
    if (fromOrTo === 'from') {
      this.fromWallet = wallet
    } else {
      this.toWallet = wallet
    }

    console.log('new wallet selected')
    this.loadDataFromExchange()
  }

  async amountSet(amount: string) {
    this.amount = new BigNumber(amount)

    this.loadDataFromExchange()
  }

  async loadDataFromExchange() {
    if (this.fromWallet && this.toWallet) {
      this.minExchangeAmount = await this.exchangeProvider.getMinAmountForCurrency(
        this.fromWallet.protocolIdentifier,
        this.toWallet.protocolIdentifier
      )
    }
    if (this.fromWallet && this.toWallet && this.amount.isGreaterThan(0)) {
      this.exchangeAmount = new BigNumber(
        await this.exchangeProvider.getExchangeAmount(
          this.fromWallet.protocolIdentifier,
          this.toWallet.protocolIdentifier,
          this.amount.toString()
        )
      )
    }
    console.log(this.minExchangeAmount, this.exchangeAmount.toFixed())
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

  dismissExchangeOnboarding() {
    this.exchangePageState = ExchangePageState.EXCHANGE
  }
}
