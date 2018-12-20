import { Component } from '@angular/core'
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular'
import { WalletsProvider } from '../../providers/wallets/wallets.provider'
import { AirGapMarketWallet, ICoinProtocol, getProtocolByIdentifier } from 'airgap-coin-lib'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Component({
  selector: 'page-exchange',
  templateUrl: 'exchange.html'
})
export class ExchangePage {
  wallets: Observable<AirGapMarketWallet[]>
  public selectedProtocol: ICoinProtocol = getProtocolByIdentifier('eth')
  public selectedWallet: AirGapMarketWallet
  public expandWalletSelection: boolean = false

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    private walletsProvider: WalletsProvider
  ) {
    this.wallets = this.walletsProvider.wallets
      .asObservable()
      .combineLatest(this.walletsProvider.walledChangedObservable, function(s1, s2) {
        return s1
      })
      .pipe(
        map(wallets => {
          const filteredWallets = wallets.filter(wallet => wallet.coinProtocol.identifier === this.selectedProtocol.identifier)
          if (filteredWallets.length > 0) {
            this.selectedWallet = filteredWallets[0]
          }
          return filteredWallets
        })
      )
  }

  async doRefresh(refresher: any = null) {
    await Promise.all(
      this.walletsProvider.getWalletList().map(wallet => {
        return wallet.synchronize()
      })
    )
  }

  doRadio() {
    const wallets = this.walletsProvider.getWalletList()
    const protocols: Map<string, ICoinProtocol> = new Map()
    wallets.forEach(wallet => {
      protocols.set(wallet.coinProtocol.identifier, wallet.coinProtocol)
    })

    let alert = this.alertCtrl.create()
    alert.setTitle('Select Currency')

    protocols.forEach((protocol: ICoinProtocol) => {
      alert.addInput({
        type: 'radio',
        label: protocol.name,
        value: protocol.identifier
      })
    })

    alert.addButton('Cancel')
    alert.addButton({
      text: 'Ok',
      handler: (data: any) => {
        console.log('Radio data:', data)
        this.selectedProtocol = getProtocolByIdentifier(data)
        this.walletsProvider.triggerWalletChanged() // TODO make better
      }
    })

    alert.present()
  }
}
