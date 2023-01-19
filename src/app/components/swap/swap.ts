import { ProtocolService } from '@airgap/angular-core'
import { animate, style, transition, trigger } from '@angular/animations'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { AlertController, ModalController } from '@ionic/angular'
import { AirGapMarketWallet, ICoinProtocol } from '@airgap/coinlib-core'
import { ProtocolSymbols } from '@airgap/coinlib-core'
import { BigNumber } from 'bignumber.js'
import { ProtocolSelectPage } from '../../pages/protocol-select/protocol-select'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { FormControl } from '@angular/forms'

@Component({
  selector: 'swap',
  templateUrl: 'swap.html',
  styleUrls: ['./swap.scss'],
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
  public amountControl: FormControl

  @Input()
  public readonly liquidity: boolean = false

  @Input()
  public readonly currentlyNotSupported: boolean = false

  @Input()
  public readonly swapSell: boolean = true

  @Input()
  public readonly selectedWallet: AirGapMarketWallet

  @Input()
  public readonly supportedWallets: AirGapMarketWallet[]

  @Input()
  public readonly disableWalletSelection: boolean = false

  @Input()
  public readonly selectedProtocol: ICoinProtocol

  @Input()
  public readonly supportedProtocols: ProtocolSymbols[] = []

  @Input()
  public readonly minExchangeAmount: BigNumber

  @Input()
  public amount: BigNumber

  @Input()
  public fiatAmount: BigNumber

  @Input()
  public customBalance: BigNumber

  @Input()
  public customSymbol: string

  protected _amount: string

  @Output()
  private readonly protocolSetEmitter: EventEmitter<ICoinProtocol> = new EventEmitter()

  @Output()
  private readonly walletSetEmitter: EventEmitter<AirGapMarketWallet> = new EventEmitter()

  constructor(
    public alertCtrl: AlertController,
    public modalController: ModalController,
    private readonly protocolService: ProtocolService
  ) {}

  public walletSet(wallet: AirGapMarketWallet): void {
    this.walletSetEmitter.emit(wallet)
    this.expandWalletSelection = false
  }

  public async doRadio(): Promise<void> {
    if (this.liquidity) {
      return
    }
    const protocols: ICoinProtocol[] = (
      await Promise.all(
        this.supportedProtocols.map(async (supportedProtocol: ProtocolSymbols) =>
          this.protocolService.getProtocol(supportedProtocol).catch(() => undefined)
        )
      )
    ).filter((protocol: ICoinProtocol | undefined) => protocol !== undefined)

    const modal: HTMLIonModalElement = await this.modalController.create({
      component: ProtocolSelectPage,
      componentProps: {
        selectedProtocol: this.selectedProtocol.identifier,
        protocols
      }
    })

    modal
      .onDidDismiss()
      .then(async (protocolIdentifier: any) => {
        if (protocolIdentifier && protocolIdentifier.data) {
          this.protocolSetEmitter.emit(await this.protocolService.getProtocol(protocolIdentifier.data))
        }
      })
      .catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))

    modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }
}
