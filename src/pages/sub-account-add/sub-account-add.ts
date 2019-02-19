import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { TezosKtProtocol, AirGapMarketWallet } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../providers/operations/operations'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { AccountProvider } from '../../providers/account/account.provider'

interface IAccountWrapper {
  selected: boolean
  wallet: AirGapMarketWallet
}

@Component({
  selector: 'page-sub-account-add',
  templateUrl: 'sub-account-add.html'
})
export class SubAccountAddPage {
  public wallet: AirGapMarketWallet
  public subAccounts: IAccountWrapper[] = []

  public subAccountType: SubProtocolType

  public typeLabel: string = ''

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private accountProvider: AccountProvider,
    private operationsProvider: OperationsProvider
  ) {
    this.subAccountType = this.navParams.get('subAccountType')

    function assertUnreachable(x: never): void {
      /* */
    }

    if (this.subAccountType === SubProtocolType.ACCOUNT) {
      this.typeLabel = 'add-sub-account.accounts_label'
    } else if (this.subAccountType === SubProtocolType.TOKEN) {
      this.typeLabel = 'add-sub-account.tokens_label'
    } else {
      assertUnreachable(this.subAccountType)
    }

    this.wallet = this.navParams.get('wallet')

    // TODO: Make generic
    if (this.subAccountType === SubProtocolType.ACCOUNT && this.wallet.protocolIdentifier === 'xtz') {
      const protocol = new TezosKtProtocol()
      protocol
        .getAddressesFromPublicKey(this.wallet.publicKey)
        .then(res => {
          res.forEach((_value, index) => {
            const wallet = new AirGapMarketWallet(
              'xtz-kt',
              this.wallet.publicKey,
              this.wallet.isExtendedPublicKey,
              this.wallet.derivationPath,
              index
            )
            const exists = this.accountProvider.walletExists(wallet)
            if (!exists) {
              wallet.addresses = res
              wallet.synchronize().catch(handleErrorSentry(ErrorCategory.COINLIB))
              this.subAccounts.push({ selected: false, wallet: wallet })
            }
          })
        })
        .catch(console.error)
    } else {
      this.wallet.coinProtocol.subProtocols.forEach(protocol => {
        const wallet = new AirGapMarketWallet(
          protocol.identifier,
          this.wallet.publicKey,
          this.wallet.isExtendedPublicKey,
          this.wallet.derivationPath
        )
        const exists = this.accountProvider.walletExists(wallet)
        if (!exists) {
          wallet.addresses = this.wallet.addresses
          wallet.synchronize().catch(handleErrorSentry(ErrorCategory.COINLIB))
          this.subAccounts.push({ selected: false, wallet: wallet })
        }
      })
    }
  }

  toggleAccount(account: IAccountWrapper) {
    account.selected = !account.selected
  }

  addSubAccounts() {
    console.log(this.subAccounts.filter(account => account.selected).map(account => account.wallet))
    this.subAccounts
      .filter(account => account.selected)
      .map(account => account.wallet)
      .forEach(wallet => {
        this.accountProvider.addWallet(wallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
      })
    this.navCtrl.pop().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  async prepareOriginate() {
    const pageOptions = await this.operationsProvider.prepareOriginate(this.wallet)

    this.navCtrl.push(pageOptions.page, pageOptions.params).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
