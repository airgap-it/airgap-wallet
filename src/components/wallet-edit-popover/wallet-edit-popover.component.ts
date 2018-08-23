import { Component } from '@angular/core'
import { AlertController, NavParams, ViewController } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { WalletsProvider } from '../../providers/wallets/wallets.provider'

@Component({
  template: `
    <ion-list no-lines no-detail>
      <ion-list-header>Wallet Settings</ion-list-header>
      <button ion-item detail-none (click)='delete()'>
        <ion-icon name='trash' color='dark' item-end></ion-icon>
        Delete
      </button>
    </ion-list>
  `
})

export class WalletEditPopoverComponent {

  private wallet: AirGapMarketWallet
  private onDelete: Function

  constructor(
    private alertCtrl: AlertController,
    private navParams: NavParams,
    private walletsProvider: WalletsProvider,
    private viewCtrl: ViewController) {
    this.wallet = this.navParams.get('wallet')
    this.onDelete = this.navParams.get('onDelete')
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
            this.viewCtrl.dismiss()
          }
        },
        {
          text: 'Delete',
          handler: () => {
            alert.present()
            this.walletsProvider.removeWallet(this.wallet).then(() => {
              this.viewCtrl.dismiss()
              if (this.onDelete) {
                this.onDelete()
              }
            })
          }
        }
      ]
    })
    alert.present()
  }

}
