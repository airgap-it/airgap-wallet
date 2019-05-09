import { Component } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountProvider } from '../../services/account/account.provider'
import { handleErrorSentry, ErrorCategory } from '../../services/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../services/operations/operations'
import { ClipboardProvider } from '../../services/clipboard/clipboard'
import { ProtocolSymbols } from '../../services/protocols/protocols'

@Component({
  templateUrl: 'account-edit-popover.component.html',
  styleUrls: ['./account-edit-popover.component.scss']
})
export class AccountEditPopoverComponent {
  private wallet: AirGapMarketWallet
  private onDelete: Function
  private onUndelegate: Function

  // Tezos
  public isTezosKT: boolean = false
  public isDelegated: boolean = false

  constructor(
    private alertCtrl: AlertController,
    private navParams: NavParams,
    private walletsProvider: AccountProvider,
    private viewCtrl: PopoverController,
    private clipboardProvider: ClipboardProvider,
    private operationsProvider: OperationsProvider
  ) {
    this.wallet = this.navParams.get('wallet')
    this.onDelete = this.navParams.get('onDelete')
    this.onUndelegate = this.navParams.get('onUndelegate')
  }

  async copyAddressToClipboard() {
    await this.clipboardProvider.copyAndShowToast(this.wallet.receivingPublicAddress)
    await this.dismissPopover()
  }

  async ngOnInit() {
    // tezos
    if (this.wallet.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.isTezosKT = true
      this.isDelegated = await this.operationsProvider.getDelegationStatusOfAddress(this.wallet.receivingPublicAddress)
    }
    // tezos end
  }

  async undelegate() {
    await this.dismissPopover()
    if (this.onUndelegate) {
      this.onUndelegate()
    } else {
      handleErrorSentry(ErrorCategory.OTHER)('onUndelegate not defined')
    }
  }

  delete() {
    let alert = this.alertCtrl
      .create({
        header: 'Confirm Wallet Removal',
        message: 'Do you want to remove this wallet? You can always sync it again from your vault.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              this.dismissPopover()
            }
          },
          {
            text: 'Delete',
            handler: () => {
              this.walletsProvider
                .removeWallet(this.wallet)
                .then(() => {
                  this.dismissPopover()
                  if (this.onDelete) {
                    this.onDelete()
                  } else {
                    handleErrorSentry(ErrorCategory.OTHER)('onDelete not defined')
                  }
                })
                .catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
            }
          }
        ]
      })
      .then(alert => {
        alert.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
  }

  dismissPopover() {
    return this.viewCtrl.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
