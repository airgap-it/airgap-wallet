import { IsolatedModuleMetadata, IsolatedModulesListPageFacade, ISOLATED_MODULES_LIST_PAGE_FACADE, UiEventService } from '@airgap/angular-core'
import { Component, Inject, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { ModalController, ViewWillEnter, ViewWillLeave } from '@ionic/angular'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { WalletModulesService } from 'src/app/services/modules/modules.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from 'src/app/services/storage/storage'
import { IsolatedModulesDetailsMode } from '../isolated-modules-details/isolated-modules.details.types'
import { IsolatedModulesOnboardingPage } from '../isolated-modules-onboarding/isolated-modules-onboarding.page'

@Component({
  selector: 'airgap-isolated-modules-list-page',
  templateUrl: './isolated-modules-list.page.html',
  styleUrls: ['./isolated-modules-list.page.scss']
})
export class IsolatedModulesListPage implements OnInit, ViewWillEnter, ViewWillLeave {
  constructor(
    @Inject(ISOLATED_MODULES_LIST_PAGE_FACADE) public readonly facade: IsolatedModulesListPageFacade,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly modalController: ModalController,
    private readonly uiEventService: UiEventService,
    private readonly storageService: WalletStorageService,
    private readonly modulesService: WalletModulesService
  ) {
    this.storageService.get(WalletStorageKey.ISOLATED_MODULES_ONBOARDING_DISABLED).then((value) => {
      if (!value) this.goToOnboardingPage()
    })
  }

  public ngOnInit(): void {
    this.facade.onViewInit()
  }

  public ionViewWillEnter(): void {
    this.facade.onViewWillEnter()
  }

  public ionViewWillLeave(): void {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }

  public async addModule(): Promise<void> {
    // TODO: move to common components
    try {
      const metadata: IsolatedModuleMetadata = await this.modulesService.loadModule()

      this.dataService.setData(DataServiceKey.DETAIL, {
        metadata,
        mode: IsolatedModulesDetailsMode.INSTALL
      })
      this.router.navigateByUrl(`/isolated-modules-details/${DataServiceKey.DETAIL}/${IsolatedModulesDetailsMode.INSTALL}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (e) {
      this.uiEventService.showTranslatedAlert({
        header: `isolated-modules-list-page.alert.add.failed.header`,
        message: `isolated-modules-list-page.alert.add.failed.message`,
        buttons: [
          {
            text: `isolated-modules-list-page.alert.add.failed.ok_label`,
            role: 'cancel'
          }
        ]
      }).catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
    }
  }
  
  public filterModules(event: any) {
    function isValidQuery(data: unknown): data is string {
      return data && typeof data === 'string' && data !== ''
    }

    const value: unknown = event.target.value
    this.facade.onFilterQueryChanged(isValidQuery(value) ? value.trim() : undefined)
  }

  public async onModuleSelected(metadata: IsolatedModuleMetadata): Promise<void> {
    this.dataService.setData(DataServiceKey.DETAIL, {
      metadata,
      mode: IsolatedModulesDetailsMode.VIEW_INSTALLED
    })
    this.router.navigateByUrl(`/isolated-modules-details/${DataServiceKey.DETAIL}/${IsolatedModulesDetailsMode.INSTALL}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async goToOnboardingPage(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: IsolatedModulesOnboardingPage,
      backdropDismiss: false
    })

    modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }
}
