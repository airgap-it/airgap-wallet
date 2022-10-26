import { AirGapMarketWallet, IAirGapTransaction } from '@airgap/coinlib-core'
import { IACMessageType } from '@airgap/serializer'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { ModalController, Platform } from '@ionic/angular'
import { InteractionSelectionComponent } from 'src/app/components/interaction-selection/interaction-selection.component'
import { AirGapMarketWalletGroup, InteractionSetting } from 'src/app/models/AirGapMarketWalletGroup'
import { InteractionService } from 'src/app/services/interaction/interaction.service'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-interaction-selection',
  templateUrl: 'interaction-selection.html',
  styleUrls: ['./interaction-selection.scss']
})
export class InteractionSelectionPage {
  public isDesktop: boolean = false
  public isLedgerSupported: boolean = false
  public isRelay: boolean = false
  public interactionData: any
  private generatedId: number | undefined = undefined

  private readonly group: AirGapMarketWalletGroup
  private readonly wallet: AirGapMarketWallet
  private readonly airGapTxs: IAirGapTransaction[]
  private readonly type: IACMessageType

  constructor(
    public readonly platform: Platform,
    private readonly route: ActivatedRoute,
    private readonly interactionService: InteractionService,
    private readonly ledgerService: LedgerService,
    private readonly modalController: ModalController
  ) {
    this.isDesktop = this.platform.is('desktop')

    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.group = info.group
      this.wallet = info.wallet
      this.airGapTxs = info.airGapTxs
      this.interactionData = info.data
      this.generatedId = info.generatedId
      this.type = info.type
      this.isRelay = info.isRelay ?? this.isRelay
      this.isLedgerSupported = this.isDesktop && this.ledgerService.isProtocolSupported(this.wallet.protocol)
    }
  }

  public async offlineDeviceSign() {
    if (this.group.interactionSetting === InteractionSetting.UNDETERMINED) {
      await this.select(InteractionSetting.OFFLINE_DEVICE)
    }
    this.interactionService.offlineDeviceSign(this.wallet, this.airGapTxs, this.interactionData, this.type, this.isRelay, this.generatedId)
  }

  public async sameDeviceSign() {
    if (this.group.interactionSetting === InteractionSetting.UNDETERMINED) {
      await this.select(InteractionSetting.SAME_DEVICE)
    }
    this.interactionService.sameDeviceSign(this.wallet, this.interactionData, this.type, this.isRelay, this.generatedId)
  }

  public async ledgerSign() {
    if (this.group.interactionSetting === InteractionSetting.UNDETERMINED) {
      await this.select(InteractionSetting.LEDGER)
    }
    this.interactionService.ledgerSign(this.wallet, this.airGapTxs, this.interactionData)
  }

  async select(selectedSetting: InteractionSetting): Promise<void> {
    return new Promise(async (resolve) => {
      const modal: HTMLIonModalElement = await this.modalController.create({
        component: InteractionSelectionComponent,
        componentProps: {
          walletGroup: this.group,
          selectedSetting,
          onlyOneGroupPresent: true,
          dismissOnly: true
        }
      })

      modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
      modal.onDidDismiss().then(() => {
        resolve()
      })
    })
  }
}
