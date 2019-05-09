import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Platform, PopoverController, ToastController } from '@ionic/angular'
import { AirGapMarketWallet, IAirGapTransaction, TezosKtProtocol } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { BigNumber } from 'bignumber.js'

import { AccountEditPopoverComponent } from '../../components/account-edit-popover/account-edit-popover.component'
import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ActionType, OperationsProvider } from '../../services/operations/operations'
import { ProtocolSymbols } from '../../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../../services/storage/storage'
// import 'core-js/es7/object'

interface CoinAction {
  type: ActionType
  name: string
  icon: string
  action(): void
}

declare let cordova

@Component({
  selector: 'page-account-transaction-list',
  templateUrl: 'account-transaction-list.html',
  styleUrls: ['./account-transaction-list.scss']
})
export class AccountTransactionListPage {
  public isRefreshing = false
  public initialTransactionsLoaded = false
  public infiniteEnabled = false
  public txOffset: number = 0
  public wallet: AirGapMarketWallet
  public transactions: IAirGapTransaction[] = []

  public protocolIdentifier: string

  public hasPendingTransactions: boolean = false

  // AE-Migration Stuff
  public aeTxEnabled: boolean = false
  public aeTxListEnabled: boolean = false
  public aeMigratedTokens: BigNumber = new BigNumber(0)
  public aeCurrentPhase: string = ''
  public aePhaseEnd: string = ''

  // XTZ
  public isKtDelegated: boolean = false

  public actions: CoinAction[] = []

  public lottieConfig = {
    path: '/assets/animations/loading.json'
  }

  private readonly TRANSACTION_LIMIT = 10

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    public popoverCtrl: PopoverController,
    public accountProvider: AccountProvider,
    public http: HttpClient,
    private readonly platform: Platform,
    private readonly operationsProvider: OperationsProvider,
    private readonly storageProvider: StorageProvider,
    private readonly toastController: ToastController,
    private readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      this.wallet = this.route.snapshot.data.special
    }

    this.protocolIdentifier = this.wallet.coinProtocol.identifier
    if (this.protocolIdentifier === ProtocolSymbols.AE) {
      this.http
        .get(`https://api-airgap.gke.papers.tech/api/v1/protocol/ae/migrations/pending/${this.wallet.addresses[0]}`)
        .subscribe((result: any) => {
          this.aeMigratedTokens = new BigNumber(result.phase.balance)
          this.aeCurrentPhase = result.phase.name
          this.aePhaseEnd = result.phase.endTimestamp
        })
    }

    if (this.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.isDelegated().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }
    if (this.protocolIdentifier === ProtocolSymbols.XTZ) {
      this.getKtAddresses().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }

    this.init()
  }

  public async init() {
    const supportedActions = this.operationsProvider.getActionsForCoin(this.wallet.protocolIdentifier)

    supportedActions.forEach(action => {
      if (action === ActionType.IMPORT_ACCOUNT) {
        this.actions.push(this.getImportAccountAction())
      } else if (action === ActionType.ADD_TOKEN) {
        this.actions.push(this.getAddTokenAction())
      } else if (action === ActionType.DELEGATE) {
        this.actions.push(this.getDelegateAction())
      } else {
        const assertNever = (x: never) => undefined
        assertNever(action)
      }
    })

    const lastTx: {
      protocol: string
      accountIdentifier: string
      date: number
    } = await this.storageProvider.get(SettingsKey.LAST_TX_BROADCAST)

    if (
      lastTx &&
      lastTx.protocol === this.wallet.protocolIdentifier &&
      lastTx.accountIdentifier === this.wallet.publicKey.substr(-6) &&
      lastTx.date > new Date().getTime() - 5 * 60 * 1000
    ) {
      this.hasPendingTransactions = true
    }
  }

  public getImportAccountAction(): CoinAction {
    return {
      type: ActionType.IMPORT_ACCOUNT,
      name: 'account-transaction-list.import-accounts_label',
      icon: 'add',
      action: async () => {
        const protocol = new TezosKtProtocol()
        const ktAddresses = await protocol.getAddressesFromPublicKey(this.wallet.publicKey)

        if (ktAddresses.length === 0) {
          this.showToast('No accounts to import.')
        } else {
          for (const [index, ktAddress] of ktAddresses.entries()) {
            await this.operationsProvider.addKtAddress(this.wallet, index, ktAddresses)
          }

          await this.location.back()
          this.showToast('Accounts imported')
        }
      }
    }
  }

  private getAddTokenAction(): CoinAction {
    return {
      type: ActionType.ADD_TOKEN,
      name: 'account-transaction-list.add-tokens_label',
      icon: 'add',
      action: () => {
        this.openAccountAddPage(SubProtocolType.TOKEN, this.wallet)
      }
    }
  }

  private getDelegateAction(): CoinAction {
    return {
      type: ActionType.DELEGATE,
      name: 'account-transaction-list.delegate_label',
      icon: 'logo-usd',
      action: async () => {
        this.openDelegateSelection()
      }
    }
  }

  private getStatusAction(ktAddresses?: string[]): CoinAction {
    return {
      type: ActionType.DELEGATE,
      name: 'account-transaction-list.delegation-status_label',
      icon: 'md-information-circle',
      action: async () => {
        let wallet = this.wallet
        if (ktAddresses) {
          wallet = await this.operationsProvider.addKtAddress(this.wallet, 0, ktAddresses)
        }
        this.openDelegateSelection(wallet)
      }
    }
  }

  /**
   * This is the "small" banner on top of the transaction.
   * This should be shown if the user has balance on mainnet,
   * but also balance on the next migration phase.
   */
  public showAeMigrationBanner() {
    return this.walletIsAe() && (this.wallet.currentBalance.gt(0) || this.transactions.length > 0) && this.aeMigratedTokens.gt(0)
  }

  /**
   * This is the full page screen informing the user about token migration
   * It should be shown when the user has migration balance, but no mainnet balance.
   */
  public showAeMigrationScreen() {
    return this.walletIsAe() && (this.wallet.currentBalance.eq(0) && this.transactions.length === 0) && this.aeMigratedTokens.gt(0)
  }

  public showNoTransactionScreen() {
    return this.transactions.length === 0 && !this.showAeMigrationScreen()
  }

  public walletIsAe() {
    return this.wallet.protocolIdentifier === ProtocolSymbols.AE
  }

  public ionViewWillEnter() {
    this.doRefresh()
  }

  public openPreparePage() {
    const info = {
      wallet: this.wallet,
      address: ''
    }
    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router.navigateByUrl('/transaction-prepare/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openReceivePage() {
    this.dataService.setData(DataServiceKey.DETAIL, this.wallet)
    this.router.navigateByUrl('/account-address/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openTransactionDetailPage(transaction: IAirGapTransaction) {
    this.dataService.setData(DataServiceKey.DETAIL, transaction)
    this.router.navigateByUrl('/transaction-detail/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openBlockexplorer() {
    const blockexplorer = this.wallet.coinProtocol.getBlockExplorerLinkForAddress(this.wallet.addresses[0])

    this.openUrl(blockexplorer)
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  public doRefresh(event: any = null) {
    if (this.wallet.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.operationsProvider.refreshAllDelegationStatuses()
    }

    this.isRefreshing = true

    if (event) {
      event.target.complete()
    }

    // this can safely be removed after AE has made the switch to mainnet
    if (this.protocolIdentifier === ProtocolSymbols.AE) {
      this.http.get('https://api-airgap.gke.papers.tech/status').subscribe((result: any) => {
        this.aeTxEnabled = result.transactionsEnabled
        this.aeTxListEnabled = result.txListEnabled
        if (this.aeTxListEnabled) {
          this.loadInitialTransactions().catch(handleErrorSentry())
        } else {
          this.transactions = []
          this.isRefreshing = false
        }
      })
    } else {
      this.loadInitialTransactions().catch(handleErrorSentry())
    }
  }

  public async doInfinite(event) {
    if (!this.infiniteEnabled) {
      return event.target.complete()
    }

    const offset = this.txOffset - (this.txOffset % this.TRANSACTION_LIMIT)
    const newTransactions = await this.getTransactions(this.TRANSACTION_LIMIT, offset)

    this.transactions = this.mergeTransactions(this.transactions, newTransactions)
    this.txOffset = this.transactions.length

    await this.storageProvider.setCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet), this.transactions)

    if (newTransactions.length < this.TRANSACTION_LIMIT) {
      this.infiniteEnabled = false
    }

    event.target.complete()
  }

  public async loadInitialTransactions(): Promise<void> {
    if (this.transactions.length === 0) {
      this.transactions =
        (await this.storageProvider.getCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet))) || []
    }

    const transactions = await this.getTransactions()

    this.transactions = this.mergeTransactions(this.transactions, transactions)

    this.isRefreshing = false
    this.initialTransactionsLoaded = true

    this.accountProvider.triggerWalletChanged()
    await this.storageProvider.setCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet), this.transactions)
    this.txOffset = this.transactions.length

    this.infiniteEnabled = true
  }

  public async getTransactions(limit: number = 10, offset: number = 0): Promise<IAirGapTransaction[]> {
    const results = await Promise.all([this.wallet.fetchTransactions(limit, offset), this.wallet.synchronize()])

    return results[0]
  }

  public mergeTransactions(oldTransactions, newTransactions): IAirGapTransaction[] {
    if (!oldTransactions) {
      return newTransactions
    }
    const transactionMap = new Map<string, IAirGapTransaction>(
      oldTransactions.map((tx: IAirGapTransaction): [string, IAirGapTransaction] => [tx.hash, tx])
    )

    newTransactions.forEach(tx => {
      transactionMap.set(tx.hash, tx)
    })

    return Array.from(transactionMap.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  public async presentEditPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: AccountEditPopoverComponent,
      componentProps: {
        wallet: this.wallet,
        onDelete: () => {
          this.location.back()
        },
        onUndelegate: async () => {
          const pageOptions = await this.operationsProvider.prepareDelegate(this.wallet)
          const info = {
            wallet: pageOptions.params.wallet,
            airGapTx: pageOptions.params.airGapTx,
            data: pageOptions.params.data
          }
          this.dataService.setData(DataServiceKey.INTERACTION, info)
          this.router
            .navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION)
            .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        }
      },
      event,
      translucent: true
    })

    return popover.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  // Tezos
  public async isDelegated(): Promise<void> {
    const { isDelegated } = await this.operationsProvider.checkDelegated(this.wallet.receivingPublicAddress)
    this.isKtDelegated = isDelegated
    const action = isDelegated ? this.getStatusAction() : this.getDelegateAction()
    this.replaceAction(ActionType.DELEGATE, action)
  }

  public async getKtAddresses() {
    const protocol = new TezosKtProtocol()
    const ktAddresses = await protocol.getAddressesFromPublicKey(this.wallet.publicKey)
    const action = ktAddresses.length > 0 ? this.getStatusAction(ktAddresses) : this.getDelegateAction()
    this.replaceAction(ActionType.DELEGATE, action)

    return ktAddresses
  }

  private replaceAction(type: ActionType, action: CoinAction) {
    const index = this.actions.findIndex(action => action.type === type)
    if (index >= 0) {
      this.actions.splice(index, 1, action)
    }
  }

  private showToast(message: string) {
    const toast = this.toastController
      .create({
        duration: 3000,
        message,
        showCloseButton: true,
        position: 'bottom'
      })
      .then(toast => {
        toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
  }

  public openDelegateSelection(wallet?: AirGapMarketWallet) {
    const info = {
      wallet: wallet || this.wallet
    }
    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router.navigateByUrl('/delegation-baker-detail/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openAccountAddPage(subProtocolType: SubProtocolType, wallet: AirGapMarketWallet) {
    const info = {
      subProtocolType,
      wallet
    }
    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router.navigateByUrl('/sub-account-add/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
