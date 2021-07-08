import { PermissionScope } from '@airgap/beacon-sdk'
import { AirGapMarketWallet, NetworkType, ProtocolNetwork, ProtocolSymbols } from '@airgap/coinlib-core'
import { Component, Input, EventEmitter, Output } from '@angular/core'
import { AlertController, ModalController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

export interface CheckboxInput {
  name: string
  type: 'radio' | 'checkbox'
  label: string
  value: PermissionScope
  icon: string
  checked: boolean
}

@Component({
  selector: 'permission-request',
  templateUrl: './permission-request.component.html',
  styleUrls: ['./permission-request.component.scss']
})
export class PermissionRequestComponent {
  public modalRef: HTMLIonModalElement | undefined
  public readonly networkType: typeof NetworkType = NetworkType

  @Input()
  public address: string = ''

  @Input()
  public network: ProtocolNetwork | undefined = undefined

  @Input()
  public requesterName: string = ''

  @Input()
  public icon: string = ''

  @Input()
  public selectableWallets: AirGapMarketWallet[] = []

  @Input()
  public inputs: CheckboxInput[] = []

  @Input()
  public targetProtocolSymbol: ProtocolSymbols | undefined = undefined

  @Output()
  public readonly walletSetEmitter: EventEmitter<AirGapMarketWallet> = new EventEmitter<AirGapMarketWallet>()

  constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly alertController: AlertController,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService
  ) {}

  public async changeAccount(): Promise<void> {
    this.modalRef = await this.modalController.getTop()

    const wallets: AirGapMarketWallet[] = this.accountService
      .getWalletList()
      .filter((wallet: AirGapMarketWallet) => wallet.protocol.identifier === this.targetProtocolSymbol)

    return new Promise(async () => {
      if (wallets.length === 1) {
        return
      }
      const alert = await this.alertController.create({
        header: this.translateService.instant('beacon-request.select-account.alert'),
        inputs: wallets.map(wallet => ({
          label: this.shortenStringPipe.transform(wallet.receivingPublicAddress),
          type: 'radio',
          value: wallet,
          checked: wallet.receivingPublicAddress === this.address
        })),
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              this.dismiss()
            }
          },
          {
            text: 'Ok',
            handler: wallet => {
              this.walletSetEmitter.emit(wallet)
            }
          }
        ]
      })

      await alert.present()
    })
  }

  public async dismiss(): Promise<boolean | void> {
    return this.modalRef.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
