import { ProtocolService, getMainIdentifier } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapCoinWallet, AirGapMarketWallet, AirGapWalletStatus, ICoinProtocol, /*NetworkType, */ProtocolSymbols } from '@airgap/coinlib-core'
import { map } from 'rxjs/operators'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { PriceService } from 'src/app/services/price/price.service'

import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AirGapMarketWalletGroup } from 'src/app/models/AirGapMarketWalletGroup'

@Component({
  selector: 'page-sub-account-import',
  templateUrl: 'sub-account-import.html'
})
export class SubAccountImportPage {
  private readonly subProtocolIdentifier: ProtocolSymbols
  private readonly networkIdentifier: string

  public subProtocol: ICoinProtocol
  public subWalletsWithGroups: [AirGapMarketWalletGroup | undefined, AirGapMarketWallet][]

  public typeLabel: string = ''

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly accountProvider: AccountProvider,
    private readonly priceService: PriceService,
    private readonly protocolService: ProtocolService,
    dataService: DataService
  ) {
    this.subWalletsWithGroups = []
    let info: any

    info = dataService.getData(DataServiceKey.PROTOCOL)

    if (info !== undefined) {
      this.subProtocolIdentifier = info.subProtocolIdentifier
      this.networkIdentifier = info.networkIdentifier
      this.protocolService.getProtocol(this.subProtocolIdentifier, this.networkIdentifier).then((protocol: ICoinProtocol) => {
        this.subProtocol = protocol
        this.filterWallets()
      })
    } else {
      this.subProtocolIdentifier = this.route.snapshot.params.protocolID
      this.networkIdentifier = this.route.snapshot.params.networkID

      this.protocolService.getProtocol(this.subProtocolIdentifier, this.networkIdentifier).then((protocol: ICoinProtocol) => {
        this.subProtocol = protocol
        this.filterWallets()
      })
    }
  }

  private filterWallets() {
    this.accountProvider.wallets$
      .pipe(
        map((mainAccounts) =>
          mainAccounts.filter(
            (wallet) =>
              wallet.status === AirGapWalletStatus.ACTIVE &&
              wallet.protocol.identifier === getMainIdentifier(this.subProtocolIdentifier) &&
              wallet.protocol.options.network.type === this.subProtocol.options.network.type
          )
        )
      )
      .subscribe((mainAccounts) => {
        const promises: Promise<void>[] = mainAccounts.map(async (mainAccount) => {
          const wallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(mainAccount.publicKey, this.subProtocolIdentifier)
          if (!wallet || wallet.status !== AirGapWalletStatus.ACTIVE) {
            const protocol = await this.protocolService.getProtocol(this.subProtocolIdentifier, this.networkIdentifier)
            const walletGroup: AirGapMarketWalletGroup = this.accountProvider.findWalletGroup(mainAccount)
            const airGapMarketWallet: AirGapMarketWallet = new AirGapCoinWallet(
              protocol,
              mainAccount.publicKey,
              mainAccount.isExtendedPublicKey,
              mainAccount.derivationPath,
              mainAccount.masterFingerprint,
              mainAccount.status,
              this.priceService
            )
            airGapMarketWallet.addresses = mainAccount.addresses
            this.subWalletsWithGroups.push([walletGroup, airGapMarketWallet])

            return airGapMarketWallet.synchronize()
          }
        })

        Promise.all(promises)
          .then(() => this.accountProvider.triggerWalletChanged())
          .catch(handleErrorSentry(ErrorCategory.COINLIB))
      })
  }

  public importWallets() {
    const walletAddInfos = this.subWalletsWithGroups.map(([group, subWallet]) => {
      return {
        walletToAdd: subWallet,
        groupId: group !== undefined ? group.id : undefined,
        groupLabel: group !== undefined ? group.label : undefined
      }
    })
    this.accountProvider.addWallets(walletAddInfos).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
    this.popToRoot()
  }

  public importWallet(group: AirGapMarketWalletGroup | undefined, subWallet: AirGapMarketWallet) {
    const walletAddInfos = [
      {
        walletToAdd: subWallet,
        groupId: group !== undefined ? group.id : undefined,
        groupLabel: group !== undefined ? group.label : undefined
      }
    ]
    this.accountProvider.addWallets(walletAddInfos).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
    this.popToRoot()
  }

  public popToRoot() {
    this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
