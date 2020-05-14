import { Component } from '@angular/core'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { ICoinProtocol } from 'airgap-coin-lib'
import { Router } from '@angular/router'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { LoadingController } from '@ionic/angular'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'

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
    private readonly loadingController: LoadingController,
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
    this.loader = await this.loadingController.create({
      message: 'Importing account...'
    })

    await this.loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

    try {
      const ledgerConnection = (await this.ledgerService.getConnectedDevices())[0]
      if (ledgerConnection) {
        const wallet = await this.ledgerService.importWallet(protocolIdentifier, ledgerConnection)
        this.dataService.setData(DataServiceKey.WALLET, wallet)
        this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      }
    } catch (error) {
      console.warn(error)
    } finally {
      this.dismissLoader()
    }
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }
}
