import { flattened } from '@airgap/angular-core'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { Component, NgZone } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController, NavController, Platform } from '@ionic/angular'
import { AccountSync } from 'src/app/types/AccountSync'

import { AccountProvider, UNGROUPED_WALLETS } from '../../services/account/account.provider'
import { DataService } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

interface AccountImport extends AccountSync {
  alreadyExists: boolean
}

@Component({
  selector: 'page-account-import',
  templateUrl: 'account-import.html'
})
export class AccountImportPage {
  public accountImports: Map<string, AccountImport[]> = new Map()
  private get allAccountImports(): AccountImport[] {
    return flattened(Array.from(this.accountImports.values()))
  }

  public loading: HTMLIonLoadingElement

  public readonly AirGapWalletStatus: typeof AirGapWalletStatus = AirGapWalletStatus

  constructor(
    private readonly platform: Platform,
    private readonly loadingCtrl: LoadingController,
    private readonly navController: NavController,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly ngZone: NgZone
  ) {
    if (!this.route.snapshot.data.special) {
      this.router.navigateByUrl('/')
      window.alert("The address you're trying to access is invalid.")
      throw new Error()
    }
  }

  public async ionViewWillEnter(): Promise<void> {
    this.accountImports.clear()
    if (this.route.snapshot.data.special) {
      this.dataService.getAccountSyncs().subscribe((accountSyncs: AccountSync[]) => {
        accountSyncs.forEach((accountSync: AccountSync) => {
          const groupLabel: string = accountSync.groupLabel || UNGROUPED_WALLETS
          if (!this.accountImports.has(groupLabel)) {
            this.accountImports.set(groupLabel, [])
          }

          this.accountImports.get(groupLabel).push({
            ...accountSync,
            alreadyExists: false
          })
        })
        this.ionViewDidEnter()
      })
    }

    await this.platform.ready()

    this.loading = await this.loadingCtrl.create({
      message: 'Syncing...'
    })

    this.loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async ionViewDidEnter(): Promise<void> {
    this.allAccountImports.forEach((accountImport: AccountImport) => {
      accountImport.alreadyExists = this.accountProvider.walletExists(accountImport.wallet)
      const airGapWorker: Worker = new Worker('./assets/workers/airgap-coin-lib.js')

      airGapWorker.onmessage = event => {
        accountImport.wallet.addresses = event.data.addresses
        accountImport.wallet
          .synchronize()
          .then(() => {
            if (accountImport.wallet.currentBalance !== undefined && accountImport.wallet.currentBalance.gt(0)) {
              accountImport.wallet.status = AirGapWalletStatus.ACTIVE
            }
            this.ngZone.run(() => {
              this.accountProvider.triggerWalletChanged()
            })
          })
          .catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
        this.loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      }

      airGapWorker.postMessage({
        protocolIdentifier: accountImport.wallet.protocol.identifier,
        publicKey: accountImport.wallet.publicKey,
        isExtendedPublicKey: accountImport.wallet.isExtendedPublicKey,
        derivationPath: accountImport.wallet.derivationPath,
        masterFingerprint: accountImport.wallet.masterFingerprint,
        status: accountImport.wallet.status
      })
    })
  }

  public async dismiss(): Promise<void> {
    this.navController.back()
  }

  public async import(): Promise<void> {
    await Promise.all(
      this.allAccountImports.map((accountimport: AccountImport) => {
        return this.accountProvider.addWallet(accountimport.wallet, accountimport.groupId, accountimport.groupLabel, { override: true })
      })
    )
    await this.router.navigateByUrl('/tabs/portfolio', { skipLocationChange: true })
  }
}
