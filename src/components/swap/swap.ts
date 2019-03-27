import { Component, Input, Output, EventEmitter } from '@angular/core'
import { NavController, NavParams, AlertController } from 'ionic-angular'
import { AccountProvider } from '../../providers/account/account.provider'
import { AirGapMarketWallet, ICoinProtocol, getProtocolByIdentifier } from 'airgap-coin-lib'
import { Observable, ReplaySubject } from 'rxjs'
import { map, take } from 'rxjs/operators'
import { trigger, transition, style, animate } from '@angular/animations'
import { BigNumber } from 'bignumber.js'

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
  public expandWalletSelection: boolean = false

  @Input()
  public readonly swapSell: boolean = true

  @Input()
  public readonly selectedWallet: AirGapMarketWallet

  @Input()
  public readonly supportedWallets: AirGapMarketWallet[]

  @Input()
  public readonly selectedProtocol: ICoinProtocol

  @Input()
  public readonly supportedProtocols: string[] = []

  @Input()
  public readonly minExchangeAmount: string

  @Input()
  public exchangeAmount: BigNumber

  protected _amount: string

  @Output()
  private readonly protocolSetEmitter: EventEmitter<ICoinProtocol> = new EventEmitter()

  @Output()
  private readonly walletSetEmitter: EventEmitter<AirGapMarketWallet> = new EventEmitter()

  @Output()
  private readonly amountSetEmitter: EventEmitter<string> = new EventEmitter()

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    private walletsProvider: AccountProvider
  ) {}

  amountSet(amount: string) {
    this._amount = amount
    this.amountSetEmitter.emit(amount)
  }

  walletSet(wallet: AirGapMarketWallet) {
    console.log('asdf')
    this.walletSetEmitter.emit(wallet)
  }

  doRadio() {
    let alert = this.alertCtrl.create()
    alert.setTitle('Select Currency')

    this.supportedProtocols.forEach((identifier: string) => {
      try {
        const protocol = getProtocolByIdentifier(identifier)
        alert.addInput({
          type: 'radio',
          label: protocol.name,
          value: protocol.identifier
        })
      } catch (error) {
        // We ignore it, error is thrown if protocol is unknown
      }
    })

    alert.addButton('Cancel')
    alert.addButton({
      text: 'Ok',
      handler: (data: any) => {
        console.log('Radio data:', data)
        this.protocolSetEmitter.emit(getProtocolByIdentifier(data))
      }
    })

    alert.present()
  }
}
