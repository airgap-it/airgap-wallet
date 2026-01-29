import { flattened } from '@airgap/angular-core'
import { AirGapWallet, AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { Component, NgZone, OnDestroy } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController, NavController, Platform } from '@ionic/angular'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { WalletModulesService } from 'src/app/services/modules/modules.service'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AccountSync } from '../../types/AccountSync'

const ROOTSTOCK_IDENTIFIER: string = 'rbtc'
const SYNC_TIMEOUT_MS: number = 60000

interface AccountImport extends AccountSync {
  alreadyExists: boolean
}

@Component({
  selector: 'page-account-import',
  templateUrl: 'account-import.html'
})
export class AccountImportPage implements OnDestroy {
  public accountImports: Map<string | undefined, AccountImport[]> = new Map()
  private get allAccountImports(): AccountImport[] {
    return flattened(Array.from(this.accountImports.values()))
  }

  public loading: HTMLIonLoadingElement
  public readonly AirGapWalletStatus: typeof AirGapWalletStatus = AirGapWalletStatus

  public isSyncing: boolean = true

  private readonly ngDestroyed$: Subject<void> = new Subject()

  public constructor(
    private readonly platform: Platform,
    private readonly loadingCtrl: LoadingController,
    private readonly navController: NavController,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly ngZone: NgZone,
    private readonly modulesService: WalletModulesService
  ) {
    if (!this.route.snapshot.data.special) {
      this.router.navigateByUrl('/')
      window.alert("The address you're trying to access is invalid.")
      throw new Error()
    }
  }

  public async ionViewWillEnter(): Promise<void> {
    this.accountImports.clear()
    this.isSyncing = true

    await this.platform.ready()

    // Create loading BEFORE setting up subscription to avoid race condition
    this.loading = await this.loadingCtrl.create({
      message: 'Syncing...',
      backdropDismiss: false
    })

    this.loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    if (this.route.snapshot.data.special) {
      this.dataService
        .getAccountSyncs()
        .pipe(takeUntil(this.ngDestroyed$))
        .subscribe((accountSyncs: AccountSync[]) => {
          accountSyncs.forEach((accountSync: AccountSync) => {
            const groupLabel: string | undefined = accountSync.groupLabel
            if (!this.accountImports.has(groupLabel)) {
              this.accountImports.set(groupLabel, [])
            }
            this.accountImports.get(groupLabel).push({
              ...accountSync,
              alreadyExists: false
            })
          })
          this.startSync()
        })
    }
  }

  private async startSync(): Promise<void> {
    try {
      const allWallets: AirGapWallet[] = this.allAccountImports.map((accountImport) => accountImport.wallet)

      const rootstockWallets: AirGapWallet[] = allWallets.filter((wallet) => wallet.protocol.identifier.startsWith(ROOTSTOCK_IDENTIFIER))
      const otherWallets: AirGapWallet[] = allWallets.filter((wallet) => !wallet.protocol.identifier.startsWith(ROOTSTOCK_IDENTIFIER))

      const syncWork: Promise<void> = this.deriveAllAddresses(otherWallets, rootstockWallets)

      // Race the sync work against a timeout
      await Promise.race([syncWork, new Promise<void>((resolve) => setTimeout(resolve, SYNC_TIMEOUT_MS))])
    } catch (error) {
      handleErrorSentry(ErrorCategory.OTHER)(error)
    } finally {
      this.isSyncing = false
      if (this.loading) {
        this.loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      }
      this.fetchBalancesInBackground()
    }
  }

  private async deriveAllAddresses(otherWallets: AirGapWallet[], rootstockWallets: AirGapWallet[]): Promise<void> {
    // Batch others
    if (otherWallets.length > 0) {
      const addresses: Record<string, string[]> = await this.modulesService.deriveAddresses(otherWallets)
      this.applyAddresses(addresses)
    }

    // Sequential derive for rootstock wallets (isolated module, one at a time because it generally affects the performance on iOS)
    for (const wallet of rootstockWallets) {
      await this.deriveWithRetry(wallet)
    }
  }

  private async deriveWithRetry(wallet: AirGapWallet): Promise<void> {
    const maxAttempts: number = 2

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const addresses: Record<string, string[]> = await this.modulesService.deriveAddresses(wallet)
        this.applyAddresses(addresses)
        return
      } catch (error) {
        if (attempt === maxAttempts) {
          handleErrorSentry(ErrorCategory.OTHER)(error)
        }
      }
    }
  }

  private applyAddresses(addresses: Record<string, string[]>): void {
    this.allAccountImports.forEach((accountImport: AccountImport) => {
      const key: string = `${accountImport.wallet.protocol.identifier}_${accountImport.wallet.publicKey}`
      if (addresses[key]) {
        accountImport.alreadyExists = this.accountProvider.walletExists(accountImport.wallet)
        accountImport.wallet.addresses = addresses[key]
        accountImport.wallet.status = AirGapWalletStatus.ACTIVE
      }
    })
  }

  private fetchBalancesInBackground(): void {
    this.allAccountImports.forEach((accountImport: AccountImport) => {
      // Fire and forget - don't await
      accountImport.wallet
        .synchronize()
        .catch(() => {
          // Silently ignore errors - balance will show as 0
        })
        .then(() => {
          this.ngZone.run(() => {
            this.accountProvider.triggerWalletChanged()
          })
        })
    })
  }

  public ngOnDestroy(): void {
    this.ngDestroyed$.next()
    this.ngDestroyed$.complete()
  }

  public async dismiss(): Promise<void> {
    this.navController.back()
  }

  public async import(): Promise<void> {
    const addWalletInfos = this.allAccountImports.map((accountimport: AccountImport) => {
      return {
        walletToAdd: accountimport.wallet,
        groupId: accountimport.groupId,
        groupLabel: accountimport.groupLabel,
        interactionSetting: accountimport.interactionSetting,
        options: { override: true }
      }
    })

    await this.accountProvider.addWallets(addWalletInfos)
    addWalletInfos.forEach((addWalletInfo) => {
      this.accountProvider.setInteractionSettingForWalletGroupByWallet(addWalletInfo.walletToAdd, addWalletInfo.interactionSetting)
    })

    await this.router.navigateByUrl('/tabs/portfolio')
  }
}
