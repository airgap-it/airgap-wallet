import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { ExchangeProvider } from '../../providers/exchange/exchange'
import { AirGapMarketWallet, ICoinProtocol, getProtocolByIdentifier } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { ExchangeConfirmPage } from '../exchange-confirm/exchange-confirm'
import { StorageProvider, SettingsKey } from '../../providers/storage/storage'
import { AccountProvider } from '../../providers/account/account.provider'
import { BigNumber } from 'bignumber.js'
import { AccountAddPage } from '../account-add/account-add'

enum ExchangePageState {
  LOADING,
  ONBOARDING,
  NOT_ENOUGH_CURRENCIES,
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
  public amount: BigNumber = new BigNumber(0)
  public minExchangeAmount: BigNumber = new BigNumber(0)
  public exchangeAmount: BigNumber

  public exchangePageStates = ExchangePageState
  public exchangePageState: ExchangePageState = ExchangePageState.LOADING

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private exchangeProvider: ExchangeProvider,
    private storageProvider: StorageProvider,
    private accountProvider: AccountProvider
  ) {}

  async ionViewWillEnter() {
    if (this.exchangePageState === ExchangePageState.LOADING || this.exchangePageState === ExchangePageState.NOT_ENOUGH_CURRENCIES) {
      this.initExchangePage()
    } else {
      const supportedProtocolsFrom = await this.exchangeProvider.getAvailableFromCurrencies()
      this.supportedProtocolsFrom = await this.filterValidProtocols(supportedProtocolsFrom)
      await this.loadWalletsForSelectedProtocol('from')

      const supportedProtocolsTo = await this.exchangeProvider.getAvailableToCurrenciesForCurrency(this.selectedFromProtocol.identifier)
      this.supportedProtocolsTo = await this.filterValidProtocols(supportedProtocolsTo, false)
      await this.loadWalletsForSelectedProtocol('to')
    }
  }

  public async filterValidProtocols(protocols: string[], filterZeroBalance: boolean = true): Promise<string[]> {
    const walletList = this.accountProvider.getWalletList()

    return protocols.filter(supportedProtocol =>
      walletList.some(
        wallet =>
          wallet.protocolIdentifier === supportedProtocol &&
          (!filterZeroBalance || (filterZeroBalance && wallet.currentBalance.isGreaterThan(0)))
      )
    )
  }

  public async initExchangePage() {
    const supportedProtocolsFrom = await this.exchangeProvider.getAvailableFromCurrencies()
    this.supportedProtocolsFrom = await this.filterValidProtocols(supportedProtocolsFrom)

    if (this.supportedProtocolsFrom.length === 0) {
      return (this.exchangePageState = ExchangePageState.NOT_ENOUGH_CURRENCIES)
    }

    await this.protocolSet('from', getProtocolByIdentifier(this.supportedProtocolsFrom[0]))

    if (this.supportedProtocolsTo.length === 0) {
      return (this.exchangePageState = ExchangePageState.NOT_ENOUGH_CURRENCIES)
    }

    const hasShownOnboarding = await this.storageProvider.get(SettingsKey.EXCHANGE_INTEGRATION)

    if (!hasShownOnboarding) {
      return (this.exchangePageState = ExchangePageState.ONBOARDING)
    }

    this.exchangePageState = ExchangePageState.EXCHANGE
  }

  async protocolSet(fromOrTo: string, protocol: ICoinProtocol) {
    if (fromOrTo === 'from') {
      this.selectedFromProtocol = protocol
    } else {
      this.selectedToProtocol = protocol
    }

    if (fromOrTo === 'from') {
      const supportedProtocolsTo = await this.exchangeProvider.getAvailableToCurrenciesForCurrency(this.selectedFromProtocol.identifier)
      this.supportedProtocolsTo = await this.filterValidProtocols(supportedProtocolsTo, false)

      if (!this.selectedToProtocol || this.selectedFromProtocol.identifier === this.selectedToProtocol.identifier) {
        if (this.supportedProtocolsTo.length > 0) {
          this.protocolSet('to', getProtocolByIdentifier(this.supportedProtocolsTo[0]))
        } else {
          return (this.exchangePageState = ExchangePageState.NOT_ENOUGH_CURRENCIES)
        }
      }
    }

    await this.loadWalletsForSelectedProtocol(fromOrTo)

    console.log('new protocol selected!')
    this.loadDataFromExchange()
  }

  async loadWalletsForSelectedProtocol(fromOrTo: string) {
    if (fromOrTo === 'from') {
      this.supportedFromWallets = this.accountProvider
        .getWalletList()
        .filter(wallet => wallet.protocolIdentifier === this.selectedFromProtocol.identifier && wallet.currentBalance.isGreaterThan(0))

      // Only set wallet if it's another protocol or not available
      if (this.shouldReplaceActiveWallet(this.fromWallet, this.supportedFromWallets)) {
        this.fromWallet = this.supportedFromWallets[0]
      }
    } else {
      this.supportedToWallets = this.accountProvider
        .getWalletList()
        .filter(wallet => wallet.protocolIdentifier === this.selectedToProtocol.identifier)
      this.toWallet = this.supportedToWallets[0]
      // Only set wallet if it's another protocol or not available
      if (this.shouldReplaceActiveWallet(this.toWallet, this.supportedToWallets)) {
        this.toWallet = this.supportedToWallets[0]
      }
    }
  }

  private shouldReplaceActiveWallet(wallet: AirGapMarketWallet, walletArray: AirGapMarketWallet[]): boolean {
    return (
      !wallet ||
      wallet.protocolIdentifier !== walletArray[0].protocolIdentifier ||
      walletArray.every(supportedWallet => !this.accountProvider.isSameWallet(supportedWallet, wallet))
    )
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
      this.minExchangeAmount = new BigNumber(
        await this.exchangeProvider.getMinAmountForCurrency(this.fromWallet.protocolIdentifier, this.toWallet.protocolIdentifier)
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
    } else {
      this.exchangeAmount = new BigNumber(0)
    }
  }

  async startExchange() {
    try {
      const result = await this.exchangeProvider.createTransaction(
        this.fromWallet.protocolIdentifier,
        this.toWallet.protocolIdentifier,
        this.toWallet.receivingPublicAddress,
        this.amount.toFixed()
      )

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
    this.initExchangePage()
    this.storageProvider.set(SettingsKey.EXCHANGE_INTEGRATION, true).catch(handleErrorSentry(ErrorCategory.STORAGE))
  }

  goToAddCoinPage() {
    this.navCtrl.push(AccountAddPage)
  }
}
