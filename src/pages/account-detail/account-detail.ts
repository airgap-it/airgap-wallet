import { Component } from '@angular/core'
import { NavController, NavParams, PopoverController } from 'ionic-angular'
import { AirGapMarketWallet, ICoinSubProtocol } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AccountTransactionListPage } from '../account-transaction-list/account-transaction-list'
import { SubAccountAddPage } from '../sub-account-add/sub-account-add'
import { AccountEditPopoverComponent } from '../../components/account-edit-popover/account-edit-popover.component'
import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'
import { SubAccountSelectPage } from '../sub-account-select/sub-account-select'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { AccountProvider } from '../../providers/account/account.provider'

@Component({
  selector: 'page-account-detail',
  templateUrl: 'account-detail.html'
})
export class AccountDetailPage {
  wallet: AirGapMarketWallet
  protocolIdentifier: string
  hasSubAccounts: boolean = false
  subProtocolTypes = SubProtocolType
  subProtocolTypesArray = Object.keys(SubProtocolType).map(key => SubProtocolType[key])
  subWalletGroups: Map<SubProtocolType, AirGapMarketWallet[]> = new Map()
  supportedSubProtocolTypes: Map<SubProtocolType, boolean> = new Map()

  public translatedLabel: string = '???' // TODO find default

  // Tezos
  public undelegatedAmount: number = 0

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private popoverCtrl: PopoverController,
    private accountProvider: AccountProvider
  ) {
    this.wallet = this.navParams.get('wallet')
    this.protocolIdentifier = this.wallet.coinProtocol.identifier
    this.accountProvider.subWallets.subscribe(subWallets => {
      const filteredSubWallets = subWallets.filter(subWallet => subWallet.publicKey === this.wallet.publicKey)
      this.subProtocolTypesArray.forEach(type => {
        const groupSubWallets = filteredSubWallets.filter(subWallet => {
          return ((subWallet.coinProtocol as any) as ICoinSubProtocol).subProtocolType === type
        })
        this.subWalletGroups.set(type, groupSubWallets)
        this.hasSubAccounts = this.hasSubAccounts || groupSubWallets.length > 0
      })

      this.subProtocolTypesArray.forEach(type => {
        this.supportedSubProtocolTypes.set(
          type,
          this.wallet.coinProtocol.subProtocols.some(protocol => {
            return ((protocol as any) as ICoinSubProtocol).subProtocolType === type
          })
        )
      })
    })
  }

  async ionViewWillEnter() {
    // Get amount of undelegated Tezos
    if (this.wallet.protocolIdentifier === 'xtz') {
      this.undelegatedAmount = 100
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

  presentEditPopover(event) {
    let popover = this.popoverCtrl.create(AccountEditPopoverComponent, {
      wallet: this.wallet,
      onDelete: () => {
        this.navCtrl.pop().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      }
    })
    popover
      .present({
        ev: event
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  goToDelegateSelection() {
    this.navCtrl
      .push(SubAccountSelectPage, {
        wallet: this.wallet
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
