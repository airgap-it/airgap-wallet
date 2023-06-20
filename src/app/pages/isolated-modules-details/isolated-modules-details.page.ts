import { IsolatedModuleMetadata, UiEventService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { PopoverController } from '@ionic/angular'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { WalletEnhancedModulesService } from 'src/app/services/modules/enhanced-modules.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

import { IsolatedModulesDetailsMode } from './isolated-modules.details.types'
import { IsolatedModulesDetailsPopoverComponent } from './popover/isolated-modules-details-popover.component'

@Component({
  selector: 'airgap-isolated-modules-details-page',
  templateUrl: './isolated-modules-details.page.html',
  styleUrls: ['./isolated-modules-details.page.scss']
})
export class IsolatedModulesDetailsPage {
  public readonly IsolatedModulesDetailsMode: typeof IsolatedModulesDetailsMode = IsolatedModulesDetailsMode

  public readonly metadata: IsolatedModuleMetadata
  private readonly oldMetadata: IsolatedModuleMetadata

  public isVerified: boolean = false

  public readonly mode: IsolatedModulesDetailsMode

  public constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly popoverController: PopoverController,
    private readonly uiEventService: UiEventService,
    private readonly modulesService: WalletEnhancedModulesService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.metadata = info.metadata
      this.oldMetadata = info.oldMetadata
      this.mode = info.mode
    }
  }

  public async presentEditPopover(event: Event): Promise<void> {
    const popover: HTMLIonPopoverElement = await this.popoverController.create({
      component: IsolatedModulesDetailsPopoverComponent,
      componentProps: {
        onRemove: (): void => {
          this.removeModule()
        }
      },
      event,
      translucent: true
    })

    popover.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }

  public async installModule() {
    if (this.mode === IsolatedModulesDetailsMode.UPDATE && this.oldMetadata && this.oldMetadata.type === 'installed') {
      await this.modulesService.removeInstalledModule(this.oldMetadata, true)
    }

    if (this.metadata && this.metadata.type === 'preview') {
      await this.modulesService.base.installModule(this.metadata)
    }

    this.router.navigateByUrl('/isolated-modules-list', { replaceUrl: true }).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async updateModule() {
    if (!this.metadata) {
      return
    }

    try {
      const updatedMetadata: IsolatedModuleMetadata = await this.loadUpdate()
      this.checkUpdatePublicKey(updatedMetadata)

      this.dataService.setData(DataServiceKey.DETAIL, {
        metadata: updatedMetadata,
        oldMetadata: this.metadata,
        mode: IsolatedModulesDetailsMode.UPDATE
      })
      this.router
        .navigateByUrl(`/isolated-modules-details/${DataServiceKey.DETAIL}/${IsolatedModulesDetailsMode.UPDATE}`)
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (e) {
      const alertType = typeof e === 'object' && 'type' in e ? e.type : 'generic'

      this.uiEventService
        .showTranslatedAlert({
          header: `isolated-modules-details-page.alert.update.${alertType}.header`,
          message: `isolated-modules-details-page.alert.update.${alertType}.message`,
          buttons: [
            {
              text: `isolated-modules-details-page.alert.update.${alertType}.ok_label`,
              role: 'cancel'
            }
          ]
        })
        .catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
    }
  }

  public removeModule() {
    this.uiEventService
      .showTranslatedAlert({
        header: 'isolated-modules-details.alert.remove.header',
        message: 'isolated-modules-details.alert.remove.message',
        buttons: [
          {
            text: 'isolated-modules-details.alert.remove.cancel_label',
            role: 'cancel'
          },
          {
            text: 'isolated-modules-details.alert.remove.proceed_label',
            handler: async (): Promise<void> => {
              if (this.metadata && this.metadata.type === 'installed') {
                await this.modulesService.removeInstalledModule(this.metadata)
              }

              this.router.navigateByUrl('/isolated-modules-list', { replaceUrl: true }).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
            }
          }
        ]
      })
      .catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  public onIsVerified(isVerified) {
    this.isVerified = isVerified
  }

  private async loadUpdate(): Promise<IsolatedModuleMetadata> {
    try {
      return await this.modulesService.base.loadModule()
    } catch (e) {
      console.error(e)
      throw { type: 'load-failed' }
    }
  }

  private checkUpdatePublicKey(updatedMetadata: IsolatedModuleMetadata) {
    if (this.getNormalizedPublicKey(this.metadata) !== this.getNormalizedPublicKey(updatedMetadata)) {
      throw { type: 'different-public-key' }
    }
  }

  private getNormalizedPublicKey(metadata: IsolatedModuleMetadata): string {
    return metadata.manifest.publicKey.toLowerCase().replace(/^0x/, '')
  }
}
