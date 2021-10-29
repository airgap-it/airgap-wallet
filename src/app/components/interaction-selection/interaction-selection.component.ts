import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { ModalController, Platform } from '@ionic/angular'
import { AirGapMarketWalletGroup, InteractionSetting } from 'src/app/models/AirGapMarketWalletGroup'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'app-interaction-selection',
  templateUrl: './interaction-selection.component.html',
  styleUrls: ['./interaction-selection.component.scss']
})
export class InteractionSelectionComponent implements OnInit {
  public interactionSetting: typeof InteractionSetting = InteractionSetting
  public selectedSetting: InteractionSetting | undefined
  public walletGroup: AirGapMarketWalletGroup
  public onlyOneGroupPresent: boolean = false
  public dismissOnly: boolean = false
  public isMobile: boolean = false

  constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly platform: Platform,
    private readonly router: Router
  ) {}

  ngOnInit() {
    this.selectedSetting = this.selectedSetting
      ? this.selectedSetting
      : this.walletGroup.interactionSetting && this.walletGroup.interactionSetting !== InteractionSetting.UNDETERMINED
      ? this.walletGroup.interactionSetting
      : InteractionSetting.ALWAYS_ASK
    this.onSelectedSettingChange(this.selectedSetting)
    this.isMobile = this.platform.is('mobile')
  }

  onSelectedSettingChange(selectedSetting: InteractionSetting) {
    this.walletGroup.interactionSetting = selectedSetting
    this.accountService.updateWalletGroup(this.walletGroup)
  }

  public async dismiss(): Promise<void> {
    if (this.onlyOneGroupPresent && !this.dismissOnly) {
      this.router.navigateByUrl('/tabs/settings', { replaceUrl: true }).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
