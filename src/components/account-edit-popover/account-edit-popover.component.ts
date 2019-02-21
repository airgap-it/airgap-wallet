import { Component } from '@angular/core'
import { AlertController, NavParams, ViewController, ToastController, NavController } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountProvider } from '../../providers/account/account.provider'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../providers/operations/operations'
import { ClipboardProvider } from '../../providers/clipboard/clipboard'

@Component({
  template: `
    <ion-list no-lines no-detail>
      <ion-list-header>{{ 'wallet-edit-popover-component.settings_label' | translate }}</ion-list-header>
      <button *ngIf="isTezosKT && !isDelegated && isSetable" ion-item detail-none (click)="delegate()">
        <ion-icon name="clipboard" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-popover-component.delegate_label' | translate }}
      </button>
      <button *ngIf="isTezosKT && isDelegated" ion-item detail-none (click)="undelegate()">
        <ion-icon name="clipboard" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-popover-component.undelegate_label' | translate }}
      </button>
      <button ion-item detail-none (click)="copyAddressToClipboard()">
        <ion-icon name="clipboard" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-popover-component.copy-address_label' | translate }}
      </button>
      <button ion-item detail-none (click)="delete()">
        <ion-icon name="trash" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-popover-component.delete_label' | translate }}
      </button>
    </ion-list>
  `
})
export class AccountEditPopoverComponent {
  // tezos
  public isTezosKT: boolean = false
  public isDelegated: boolean = false
  public isSetable: boolean = false
  // tezos end

  private wallet: AirGapMarketWallet
  private onDelete: Function

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
  }

  async ngOnInit() {
    // tezos
    if (this.wallet.protocolIdentifier.toLowerCase().startsWith('xtz')) {
      this.isTezosKT = true
      const delegatedResult = await this.operationsProvider.checkDelegated(this.wallet.receivingPublicAddress)
      this.isDelegated = delegatedResult.isDelegated
      this.isSetable = delegatedResult.setable
    }
    // tezos end
  }

  async delegate() {
    const pageOptions = await this.operationsProvider.prepareDelegate(this.wallet, 'tz1eEnQhbwf6trb8Q8mPb2RaPkNk2rN7BKi8')

    this.navCtrl.push(pageOptions.page, pageOptions.params).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    this.dismissPopover()
  }

  async undelegate() {
    const pageOptions = await this.operationsProvider.prepareDelegate(this.wallet)

    this.navCtrl.push(pageOptions.page, pageOptions.params).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    this.dismissPopover()
  }

  async copyAddressToClipboard() {
    await this.clipboardProvider.copyAndShowToast(this.wallet.receivingPublicAddress)
    this.dismissPopover()
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
    this.viewCtrl.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
