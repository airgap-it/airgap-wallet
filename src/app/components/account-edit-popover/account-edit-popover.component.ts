import { ClipboardService, ProtocolService } from '@airgap/angular-core'
import { AirGapMarketWallet, ICoinProtocol, SubProtocolSymbols } from '@airgap/coinlib-core'
import { ProtocolNetwork } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { ImportAccoutActionContext } from '@airgap/tezos'
import { ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { supportsDelegation } from 'src/app/helpers/delegation'
import { ButtonAction } from 'src/app/models/actions/ButtonAction'
import { BrowserService } from 'src/app/services/browser/browser.service'

import { AccountProvider } from '../../services/account/account.provider'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  templateUrl: 'account-edit-popover.component.html',
  styleUrls: ['./account-edit-popover.component.scss']
})
export class AccountEditPopoverComponent implements OnInit {
  private readonly wallet: AirGapMarketWallet
  private readonly onDelete: Function

  // Tezos
  public importAccountAction: ButtonAction<string[], ImportAccoutActionContext>
  public isTezosKT: boolean = false
  public isDelegated: boolean = false

  public networks: ProtocolNetwork[] = []

  constructor(
    private readonly alertCtrl: AlertController,
    private readonly navParams: NavParams,
    private readonly walletsProvider: AccountProvider,
    private readonly viewCtrl: PopoverController,
    private readonly clipboardProvider: ClipboardService,
    private readonly translateService: TranslateService,
    private readonly operationsProvider: OperationsProvider,
    private readonly browserService: BrowserService,
    private readonly cdr: ChangeDetectorRef,
    private readonly protocolService: ProtocolService
  ) {
    this.wallet = this.navParams.get('wallet')
    this.importAccountAction = this.navParams.get('importAccountAction')
    this.onDelete = this.navParams.get('onDelete')

    this.initNetworks()
  }

  public async copyAddressToClipboard(): Promise<void> {
    await this.clipboardProvider.copyAndShowToast(this.wallet.receivingPublicAddress)
    await this.dismissPopover()
  }

  public async openBlockExplorer(): Promise<void> {
    const protocol: ICoinProtocol = this.wallet.protocol

    const blockexplorer: string = await protocol.getBlockExplorerLinkForAddress(this.wallet.addresses[0])

    await this.browserService.openUrl(blockexplorer)
  }

  public async ngOnInit(): Promise<void> {
    // tezos
    if (this.wallet.protocol.identifier === SubProtocolSymbols.XTZ_KT) {
      this.isTezosKT = true
    }
    if (supportsDelegation(this.wallet.protocol)) {
      this.isDelegated = await this.operationsProvider.getDelegationStatus(this.wallet)
    }
    // tezos end
  }

  public async delete(): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('account-edit-popover-component.header'),
      message: this.translateService.instant('account-edit-popover-component.message'),
      buttons: [
        {
          text: this.translateService.instant('account-edit-popover-component.cancel'),
          role: 'cancel',
          handler: () => {
            this.dismissPopover()
          }
        },
        {
          text: this.translateService.instant('account-edit-popover-component.delete'),
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
    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  public async changeNetwork() {
    const alert = await this.alertCtrl.create({
      header: 'Network',
      inputs: this.networks.map((network, index) => ({
        name: network.name,
        type: 'radio',
        label: network.name,
        value: index,
        checked: this.wallet.protocol.options.network.identifier === network.identifier
      })),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel')
          }
        },
        {
          text: 'Ok',
          handler: async (data) => {
            await this.walletsProvider.setWalletNetwork(this.wallet, this.networks[data])
            this.cdr.detectChanges()
            await this.dismissPopover()
          }
        }
      ]
    })

    await alert.present()
  }

  public dismissPopover(): Promise<boolean | void> {
    return this.viewCtrl.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async initNetworks(): Promise<void> {
    this.networks = await this.protocolService.getNetworksForProtocol(this.wallet.protocol.identifier)
  }
}
