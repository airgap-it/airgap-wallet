import { Component } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'

import { AccountProvider } from '../../services/account/account.provider'
import { ClipboardProvider } from '../../services/clipboard/clipboard'
import { OperationsProvider } from '../../services/operations/operations'
import { ProtocolSymbols } from '../../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  templateUrl: 'account-edit-popover.component.html',
  styleUrls: ['./account-edit-popover.component.scss']
})
export class AccountEditPopoverComponent {
  private readonly wallet: AirGapMarketWallet
  private readonly onDelete: Function
  private readonly onUndelegate: Function

  // Tezos
  public isTezosKT: boolean = false
  public isDelegated: boolean = false

  constructor(
    private readonly alertCtrl: AlertController,
    private readonly navParams: NavParams,
    private readonly walletsProvider: AccountProvider,
    private readonly viewCtrl: PopoverController,
    private readonly clipboardProvider: ClipboardProvider,
    private readonly operationsProvider: OperationsProvider
  ) {
    this.wallet = this.navParams.get('wallet')
    this.onDelete = this.navParams.get('onDelete')
    this.onUndelegate = this.navParams.get('onUndelegate')
  }

  public async copyAddressToClipboard() {
    await this.clipboardProvider.copyAndShowToast(this.wallet.receivingPublicAddress)
    await this.dismissPopover()
  }

  public async ngOnInit() {
    // tezos
    if (this.wallet.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.isTezosKT = true
      this.isDelegated = await this.operationsProvider.getDelegationStatusOfAddress(this.wallet.receivingPublicAddress)
    }
    // tezos end
  }

  public async undelegate() {
    await this.dismissPopover()
    if (this.onUndelegate) {
      this.onUndelegate()
    } else {
      handleErrorSentry(ErrorCategory.OTHER)('onUndelegate not defined')
    }
  }

  public delete() {
    const alert = this.alertCtrl
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

  public dismissPopover() {
    return this.viewCtrl.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
