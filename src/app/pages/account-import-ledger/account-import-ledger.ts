import { Component } from '@angular/core'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { ICoinProtocol } from 'airgap-coin-lib'
import { Router } from '@angular/router'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { LoadingController, AlertController } from '@ionic/angular'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { TranslateService } from '@ngx-translate/core'
import { isString } from 'util'

@Component({
  selector: 'page-account-import-ledger',
  templateUrl: 'account-import-ledger.html'
})
export class AccountImportLedgerPage {
  public readonly supportedProtocols: ICoinProtocol[] = []
  public filteredSupportedProcotols: ICoinProtocol[] = []

  public searchTerm: string = ''

  private loader: HTMLIonLoadingElement | undefined

  constructor(
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly alertCtrl: AlertController,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService,
    private readonly ledgerService: LedgerService
  ) {
    this.supportedProtocols = this.ledgerService.getSupportedProtocols()
    this.filteredSupportedProcotols = this.supportedProtocols
  }

  public setFilteredProtocols(searchTerm: string) {
    if (this.searchTerm.length === 0) {
      this.filteredSupportedProcotols = this.supportedProtocols
    } else {
      const searchTermLowerCase = searchTerm.toLocaleLowerCase()
      this.filteredSupportedProcotols = this.supportedProtocols.filter(
        protocol =>
          protocol.name.toLocaleLowerCase().includes(searchTermLowerCase) || protocol.symbol.toLocaleLowerCase().includes(searchTerm)
      )
    }
  }

  public async importAccount(protocolIdentifier: string) {
    await this.showLoader('Importing account...')

    try {
      const ledgerConnection = (await this.ledgerService.getConnectedDevices())[0]
      if (ledgerConnection) {
        const wallet = await this.ledgerService.importWallet(protocolIdentifier, ledgerConnection)
        this.dataService.setData(DataServiceKey.WALLET, wallet)
        this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      } else {
        this.promptError('Device has not been detected.')
      }
    } catch (error) {
      console.warn(error)
      this.promptError(error)
    } finally {
      this.dismissLoader()
    }
  }

  private async promptError(error: unknown) {
    let message: string
    if (isString(error)) {
      message = error
    } else if (error instanceof Error) {
      message = error.message
    } else {
      message = this.translateService.instant('account-import-ledger.error-alert.unknown')
    }

    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('account-import-ledger.error-alert.header'),
      message,
      buttons: [
        {
          text: this.translateService.instant('account-import-ledger.error-alert.confirm')
        }
      ]
    })
    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  private async showLoader(message: string) {
    this.dismissLoader()
    this.loader = await this.loadingController.create({ message })

    await this.loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }
}
