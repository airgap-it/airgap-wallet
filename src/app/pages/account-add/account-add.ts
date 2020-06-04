import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { ICoinProtocol, supportedProtocols } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ProtocolsProvider } from '../../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { Platform, AlertController, LoadingController } from '@ionic/angular'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { isString } from 'util'
import { TranslateService } from '@ngx-translate/core'
import { AccountImportInteractionType } from '../account-import-interaction-selection/account-import-interaction-selection'

@Component({
  selector: 'page-account-add',
  templateUrl: 'account-add.html',
  styleUrls: ['./account-add.scss']
})
export class AccountAddPage {
  public searchTerm: string = ''
  public supportedAccountProtocols: ICoinProtocol[] = []
  public supportedSubAccountProtocols: ICoinProtocol[] = []
  public filteredAccountProtocols: ICoinProtocol[] = []
  public filteredSubAccountProtocols: ICoinProtocol[] = []

  private loader: HTMLIonLoadingElement | undefined

  constructor(
    private readonly platform: Platform,
    private readonly accountProvider: AccountProvider,
    private readonly protocolsProvider: ProtocolsProvider,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly alertCtrl: AlertController,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService,
    private readonly ledgerService: LedgerService
  ) {
    this.supportedAccountProtocols = supportedProtocols().map(coin => coin)
    this.supportedSubAccountProtocols = supportedProtocols().reduce((pv, cv) => {
      if (cv.subProtocols) {
        const subProtocols = cv.subProtocols.filter(
          subProtocol =>
            subProtocol.subProtocolType === SubProtocolType.TOKEN &&
            this.protocolsProvider.getEnabledSubProtocols().indexOf(subProtocol.identifier) >= 0
        )

        return pv.concat(...subProtocols)
      }

      return pv
    }, [])
    this.filterProtocols()
  }

  public searchTermChanged() {
    this.filterProtocols()
  }

  public filterProtocols() {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase()
    this.filteredAccountProtocols = this.supportedAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredSubAccountProtocols = this.supportedSubAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
  }

  public addAccount(protocolIdentifier: string) {
    const isLedgerImportAvailable = this.ledgerService.getSupportedProtocols().includes(protocolIdentifier) && this.platform.is('desktop')
    if (!isLedgerImportAvailable) {
      this.importFromVault(protocolIdentifier)
    } else {
      this.showImportInteractionSelection(protocolIdentifier)
    }
  }

  public addSubAccount(subProtocolIdentifier: string) {
    const mainProtocolIdentifier = subProtocolIdentifier.split('-')[0]
    if (this.accountProvider.getWalletList().filter(protocol => protocol.protocolIdentifier === mainProtocolIdentifier).length > 0) {
      const info = {
        subProtocolIdentifier
      }
      this.dataService.setData(DataServiceKey.PROTOCOL, info)
      this.router.navigateByUrl('/sub-account-import/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      const info = {
        mainProtocolIdentifier: mainProtocolIdentifier,
        subProtocolIdentifier: subProtocolIdentifier
      }
      this.dataService.setData(DataServiceKey.PROTOCOL, info)
      this.router.navigateByUrl('/account-import-onboarding/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private showImportInteractionSelection(protocolIdentifier: string) {
    const info = {
      callback: (interactionType: AccountImportInteractionType) => {
        switch (interactionType) {
          case AccountImportInteractionType.VAULT:
            this.importFromVault(protocolIdentifier)
            break
          case AccountImportInteractionType.LEDGER:
            this.importFromLedger(protocolIdentifier)
            break
          default:
            console.log('Unkonw import interaction type selected.')
        }
      }
    }

    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router
      .navigateByUrl(`/account-import-interaction-selection/${DataServiceKey.INTERACTION}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async importFromLedger(protocolIdentifier: string): Promise<void> {
    await this.showLoader('Importing account...')

    try {
      const wallet = await this.ledgerService.importWallet(protocolIdentifier)
      this.dataService.setData(DataServiceKey.WALLET, wallet)
      this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      console.warn(error)
      this.promptError(error)
    } finally {
      this.dismissLoader()
    }
  }

  private importFromVault(protocolIdentifier: string) {
    const info = {
      mainProtocolIdentifier: protocolIdentifier
    }
    this.dataService.setData(DataServiceKey.PROTOCOL, info)
    this.router.navigateByUrl('/account-import-onboarding/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
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
