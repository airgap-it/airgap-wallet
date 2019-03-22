import { Component } from '@angular/core'
import { NavController, NavParams, PopoverController } from 'ionic-angular'
import { AirGapMarketWallet, ICoinSubProtocol } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AccountTransactionListPage } from '../account-transaction-list/account-transaction-list'
import { SubAccountAddPage } from '../sub-account-add/sub-account-add'
import { AccountEditPopoverComponent } from '../../components/account-edit-popover/account-edit-popover.component'
import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'
import { AccountAddressPage } from '../account-address/account-address'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { AccountProvider } from '../../providers/account/account.provider'
import { OperationsProvider } from '../../providers/operations/operations'
import BigNumber from 'bignumber.js'
import { SubAccountSelectPage } from '../sub-account-select/sub-account-select'
import { WebExtensionProvider } from '../../providers/web-extension/web-extension'

@Component({
  selector: 'page-account-detail',
  templateUrl: 'account-detail.html'
})
export class AccountDetailPage {
  wallet: AirGapMarketWallet
  protocolIdentifier: string
  hasSubAccounts: boolean = false
  subProtocolTypes = SubProtocolType
  subProtocolTypesArray: SubProtocolType[] = Object.keys(SubProtocolType).map(key => SubProtocolType[key])
  subWalletGroups: Map<SubProtocolType, AirGapMarketWallet[]> = new Map()
  supportedSubProtocolTypes: Map<SubProtocolType, boolean> = new Map()

  public translatedLabel: string = 'account-detail.tokens_label'

  // Tezos
  public delegatedAmount: BigNumber = new BigNumber(0)
  public undelegatedAmount: BigNumber = new BigNumber(0)

  // Web Extension
  isWebExtension: boolean = false
  isActive: boolean = false

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private popoverCtrl: PopoverController,
    private accountProvider: AccountProvider,
    private operationsProvider: OperationsProvider,
    private webExtensionProvider: WebExtensionProvider
  ) {
    function assertUnreachable(x: never): void {
      /* */
    }

    this.isWebExtension = this.webExtensionProvider.isWebExtension()

    this.wallet = this.navParams.get('wallet')
    this.protocolIdentifier = this.wallet.coinProtocol.identifier
    this.accountProvider.subWallets.subscribe(subWallets => {
      this.hasSubAccounts = false
      const filteredSubWallets = subWallets.filter(subWallet => subWallet.publicKey === this.wallet.publicKey)
      this.subProtocolTypesArray.forEach(type => {
        const groupSubWallets = filteredSubWallets.filter(subWallet => {
          return ((subWallet.coinProtocol as any) as ICoinSubProtocol).subProtocolType === type
        })
        this.subWalletGroups.set(type, groupSubWallets)
        this.hasSubAccounts = this.hasSubAccounts || groupSubWallets.length > 0

        const subProtocolSupported = this.wallet.coinProtocol.subProtocols.some(protocol => {
          return ((protocol as any) as ICoinSubProtocol).subProtocolType === type
        })

        if (subProtocolSupported) {
          if (type === SubProtocolType.ACCOUNT) {
            this.translatedLabel = 'account-detail.accounts_label'
          } else if (type === SubProtocolType.TOKEN) {
            this.translatedLabel = 'account-detail.tokens_label'
          } else {
            assertUnreachable(type)
          }
        }
        this.supportedSubProtocolTypes.set(type, subProtocolSupported)
      })
    })
  }

  ngOnInit(): void {
    this.accountProvider.activeAccountSubject.subscribe(activeAccount => {
      if (this.wallet && activeAccount) {
        this.isActive = this.accountProvider.isSameWallet(this.wallet, activeAccount)
      }
    })
  }

  async ionViewWillEnter() {
    if (this.wallet.protocolIdentifier === 'xtz-kt') {
      this.operationsProvider.refreshAllDelegationStatuses()
    }

    // Get amount of undelegated Tezos
    if (this.wallet.protocolIdentifier === 'xtz') {
      this.delegatedAmount = new BigNumber(0)
      this.undelegatedAmount = new BigNumber(0)
      this.subWalletGroups.get(SubProtocolType.ACCOUNT).forEach(async wallet => {
        const delegatedResult = await this.operationsProvider.checkDelegated(wallet.receivingPublicAddress)
        if (delegatedResult.isDelegated) {
          this.delegatedAmount = this.delegatedAmount.plus(wallet.currentBalance)
        }
        if (!delegatedResult.isDelegated && delegatedResult.setable) {
          this.undelegatedAmount = this.undelegatedAmount.plus(wallet.currentBalance)
        }
      })
    }
  }

  openTransactionPage(wallet: AirGapMarketWallet) {
    this.navCtrl.push(AccountTransactionListPage, { wallet: wallet }).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openAccountAddPage(subProtocolType: SubProtocolType, wallet: AirGapMarketWallet) {
    this.navCtrl
      .push(SubAccountAddPage, { subProtocolType: subProtocolType, wallet: wallet })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openPreparePage() {
    this.navCtrl
      .push(TransactionPreparePage, {
        wallet: this.wallet
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openReceivePage() {
    this.navCtrl
      .push(AccountAddressPage, {
        wallet: this.wallet
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  presentEditPopover(event) {
    let popover = this.popoverCtrl.create(AccountEditPopoverComponent, {
      wallet: this.wallet,
      onDelete: () => {
        this.navCtrl.pop().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      },
      onUndelegate: pageOptions => {
        this.navCtrl.push(pageOptions.page, pageOptions.params).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      }
    })
    popover
      .present({
        ev: event
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  goToDelegateSelection() {
    if (this.hasSubAccounts) {
      this.navCtrl
        .push(SubAccountSelectPage, {
          wallet: this.wallet
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      this.navCtrl
        .push(SubAccountAddPage, {
          subProtocolType: this.subProtocolTypes.ACCOUNT,
          wallet: this.wallet
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  public activateAccount() {
    this.accountProvider.changeActiveAccount(this.wallet)
  }
}
