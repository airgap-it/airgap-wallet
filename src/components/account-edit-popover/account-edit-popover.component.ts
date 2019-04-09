import { Component } from '@angular/core'
import { AlertController, NavParams, ViewController, NavController } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountProvider } from '../../providers/account/account.provider'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../providers/operations/operations'
import { ClipboardProvider } from '../../providers/clipboard/clipboard'

const XTZ_KT = 'xtz-kt'

@Component({
  template: `
    <ion-list no-lines no-detail>
      <ion-list-header>{{ 'wallet-edit-popover-component.settings_label' | translate }}</ion-list-header>
      <button ion-item detail-none (click)="copyAddressToClipboard()">
        <ion-icon name="clipboard" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-popover-component.copy-address_label' | translate }}
      </button>
      <button ion-item detail-none (click)="delete()">
        <ion-icon name="trash" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-popover-component.delete_label' | translate }}
      </button>
      <button *ngIf="isTezosKT && isDelegated" ion-item detail-none (click)="undelegate()">
        <ion-icon name="close" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-popover-component.undelegate_label' | translate }}
      </button>
    </ion-list>
  `
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
    private navCtrl: NavController,
    private navParams: NavParams,
    private walletsProvider: AccountProvider,
    private viewCtrl: ViewController,
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
    if (this.wallet.protocolIdentifier === XTZ_KT) {
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
    let alert = this.alertCtrl.create({
      title: 'Confirm Wallet Removal',
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
    alert.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  dismissPopover() {
    return this.viewCtrl.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
