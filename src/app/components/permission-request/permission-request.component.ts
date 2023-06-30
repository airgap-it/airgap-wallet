import { flattened } from '@airgap/angular-core'
import { PermissionScope } from '@airgap/beacon-sdk'
import { AirGapMarketWallet, NetworkType, ProtocolNetwork, ProtocolSymbols } from '@airgap/coinlib-core'
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
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
export class PermissionRequestComponent implements OnChanges {
  public modalRef: HTMLIonModalElement | undefined
  public readonly networkType: typeof NetworkType = NetworkType

  public wallets: Partial<Record<ProtocolSymbols, AirGapMarketWallet[]>> = {}
  public totalWalletsLength: number = 0

  @Input()
  public address: string = ''

  @Input()
  public protocolIdentifier: ProtocolSymbols | undefined

  @Input()
  public network: ProtocolNetwork | undefined

  @Input()
  public requesterName: string = ''

  @Input()
  public icon: string = ''

  @Input()
  public inputs: CheckboxInput[] = []

  @Input()
  public targetProtocolSymbol: ProtocolSymbols | ProtocolSymbols[] | undefined

  @Output()
  public readonly walletSetEmitter: EventEmitter<AirGapMarketWallet> = new EventEmitter<AirGapMarketWallet>()

  public constructor(
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService,
    private readonly accountService: AccountProvider
  ) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.targetProtocolSymbol?.currentValue !== changes.targetProtocolSymbol?.previousValue) {
      const allWallets = this.accountService.getActiveWalletList()
      const targetProtocolSymbol = changes.targetProtocolSymbol.currentValue
      const targetProtocolSymbols = new Set(Array.isArray(targetProtocolSymbol) ? targetProtocolSymbol : [targetProtocolSymbol])

      this.wallets = allWallets.reduce((obj: Partial<Record<ProtocolSymbols, AirGapMarketWallet[]>>, wallet: AirGapMarketWallet) => {
        const protocolIdentifier = wallet.protocol.identifier
        if (!targetProtocolSymbols.has(wallet.protocol.identifier)) {
          return obj
        }

        const wallets = obj[wallet.protocol.identifier] ?? []
        wallets.push(wallet)

        return Object.assign(obj, { [protocolIdentifier]: wallets })
      }, {})
      this.totalWalletsLength = Object.values(this.wallets)
        .map((wallets) => wallets.length)
        .reduce((acc, next) => acc + next, 0)
    }
  }

  public async changeAccount(): Promise<void> {
    this.modalRef = await this.modalController.getTop()

    return new Promise(async () => {
      if (Object.entries(this.wallets).length === 1 && Object.entries(this.wallets)[0][1].length === 1) {
        return
      }
      const groupedWallets: [number, AirGapMarketWallet][] = flattened(
        Object.values(this.wallets).map((wallets, index) => wallets.map((wallet) => [index, wallet]))
      )

      const alert = await this.alertController.create({
        header: this.translateService.instant('beacon-request.select-account.alert'),
        inputs: groupedWallets.map(([index, wallet]) => ({
          tabindex: index,
          label: `${this.shortenStringPipe.transform(wallet.receivingPublicAddress)} (${wallet.protocol.name})`,
          type: 'radio',
          value: wallet,
          checked:
            wallet.receivingPublicAddress === this.address &&
            (this.protocolIdentifier ? wallet.protocol.identifier === this.protocolIdentifier : true)
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
            handler: (wallet) => {
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
