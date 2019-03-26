import { Component, Input, Output, EventEmitter } from '@angular/core'
import { NavController, NavParams, AlertController } from 'ionic-angular'
import { AccountProvider } from '../../providers/account/account.provider'
import { AirGapMarketWallet, ICoinProtocol, getProtocolByIdentifier } from 'airgap-coin-lib'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { trigger, transition, style, animate } from '@angular/animations'

@Component({
  selector: 'swap',
  templateUrl: 'swap.html',
  animations: [
    trigger('expandWalletAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(-20%)', opacity: 0 }),
        animate('500ms', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate('500ms', style({ transform: 'translateY(-20%)', opacity: 0 }))
      ])
    ])
  ]
})
export class SwapComponent {
  public wallets: Observable<AirGapMarketWallet[]>
  public selectedProtocol: ICoinProtocol = getProtocolByIdentifier('eth')
  public selectedWallet: AirGapMarketWallet
  public expandWalletSelection: boolean = false

  @Input()
  public supportedProtocols: string[] = []

  @Input()
  public minExchangeAmount: string

  @Input()
  public exchangeAmount: string

  @Output()
  walletSelectedEmitter: EventEmitter<AirGapMarketWallet> = new EventEmitter()

  @Output()
  amountSetEmitter: EventEmitter<string> = new EventEmitter()

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    private walletsProvider: AccountProvider
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
            this.selectWallet(filteredWallets[0])
          }
          return filteredWallets
        })
      )
  }

  amountChanged(amount: string) {
    this.amountSetEmitter.emit(amount)
  }

  selectWallet(wallet: AirGapMarketWallet) {
    this.selectedWallet = wallet
    console.log('wallet selected')
    this.walletSelectedEmitter.emit(wallet)
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
      if (this.supportedProtocols.indexOf(wallet.coinProtocol.identifier) >= 0) {
        protocols.set(wallet.coinProtocol.identifier, wallet.coinProtocol)
      }
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
  @Input()
  public swapSell: boolean = true
}
