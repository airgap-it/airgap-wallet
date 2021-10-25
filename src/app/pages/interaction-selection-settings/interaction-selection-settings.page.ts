import { AirGapWalletStatus } from '@airgap/coinlib-core'
import { Component, OnInit } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { InteractionSelectionComponent } from 'src/app/components/interaction-selection/interaction-selection.component'
import { AirGapMarketWalletGroup, InteractionSetting } from 'src/app/models/AirGapMarketWalletGroup'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'app-interaction-selection-settings',
  templateUrl: './interaction-selection-settings.page.html',
  styleUrls: ['./interaction-selection-settings.page.scss']
})
export class InteractionSelectionSettingsPage implements OnInit {
  public interactionSetting: typeof InteractionSetting = InteractionSetting
  public selectedSetting: InteractionSetting | undefined
  public activeWalletGroups: AirGapMarketWalletGroup[] | undefined

  constructor(private readonly accountService: AccountProvider, private readonly modalController: ModalController) {}

  ngOnInit() {
    this.activeWalletGroups = this.accountService.allWalletGroups.filter((walletGroup) => walletGroup.status === AirGapWalletStatus.ACTIVE)
    if (this.activeWalletGroups.length === 1) {
      this.select(this.activeWalletGroups[0], true)
    }
  }

  async select(walletGroup: AirGapMarketWalletGroup, onlyOneGroupPresent: boolean = false): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: InteractionSelectionComponent,
      componentProps: {
        walletGroup,
        onlyOneGroupPresent
      }
    })

    modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }
}
