import { NgModule } from '@angular/core'
import { PreloadAllModules, RouterModule, Routes } from '@angular/router'

import { ProtocolGuard } from './services/guard/protocol.guard'
import { ServiceKeyGuard } from './services/guard/serviceKey.guard'
import { TransactionHashGuard } from './services/guard/transactionHash.guard'
import { DataResolverService } from './services/resolver/data-resolver.service'

const routes: Routes = [
  { path: '', loadChildren: () => import('./pages/tabs/tabs.module').then((m) => m.TabsPageModule) },
  { path: 'about', loadChildren: () => import('./pages/about/about.module').then((m) => m.AboutPageModule) },
  {
    path: 'account-add',
    loadChildren: () => import('./pages/account-add/account-add.module').then((m) => m.AccountAddPageModule)
  },
  {
    path: 'account-import-interaction-selection/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () =>
      import('./pages/account-import-interaction-selection/account-import-interaction-selection.module').then(
        (m) => m.AccountImportInteractionSelectionPageModule
      )
  },
  {
    path: 'account-import-onboarding/:id/:protocolID',
    canActivate: [ServiceKeyGuard],
    loadChildren: () =>
      import('./pages/account-import-onboarding/account-import-onboarding.module').then((m) => m.AccountImportOnboardingPageModule)
  },
  {
    path: 'account-import-ledger-onboarding/:id/:protocolID',
    canActivate: [ProtocolGuard, ServiceKeyGuard],

    loadChildren: () =>
      import('./pages/account-import-ledger-onboarding/account-import-ledger-onboarding.module').then(
        (m) => m.AccountImportLedgerOnboardingPageModule
      )
  },
  {
    path: 'select-wallet/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/select-wallet/select-wallet.module').then((m) => m.SelectWalletPageModule)
  },
  {
    path: 'account-import/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/account-import/account-import.module').then((m) => m.AccountImportPageModule)
  },
  {
    path: 'account-transaction-list/:id/:publicKey/:protocolID/:addressIndex',
    canActivate: [ProtocolGuard, ServiceKeyGuard],

    loadChildren: () =>
      import('./pages/account-transaction-list/account-transaction-list.module').then((m) => m.AccountTransactionListPageModule)
  },
  {
    path: 'transaction-detail/:id/:hash',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard, TransactionHashGuard],
    loadChildren: () => import('./pages/transaction-detail/transaction-detail.module').then((m) => m.TransactionDetailPageModule)
  },
  {
    path: 'sub-account-add/:id/:publicKey/:protocolID/:addressIndex/:subProtocolType',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ProtocolGuard, ServiceKeyGuard],

    loadChildren: () => import('./pages/sub-account-add/sub-account-add.module').then((m) => m.SubAccountAddPageModule)
  },
  {
    path: 'sub-account-add-generic/:id/:protocolID/:networkID/:genericSubProtocolType',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ProtocolGuard, ServiceKeyGuard],
    loadChildren: () => import('./pages/sub-account-add-generic/sub-account-add-generic.module').then((m) => m.SubAccountAddGenericPageModule)
  },
  {
    path: 'sub-account-select/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/sub-account-select/sub-account-select.module').then((m) => m.SubAccountSelectPageModule)
  },
  {
    path: 'sub-account-import/:id/:protocolID/:networkID',
    canActivate: [ProtocolGuard, ServiceKeyGuard],

    loadChildren: () => import('./pages/sub-account-import/sub-account-import.module').then((m) => m.SubAccountImportPageModule)
  },
  {
    path: 'account-address/:id/:publicKey/:protocolID/:addressIndex',
    canActivate: [ProtocolGuard, ServiceKeyGuard],

    loadChildren: () => import('./pages/account-address/account-address.module').then((m) => m.AccountAddressPageModule)
  },
  {
    path: 'transaction-prepare/:id/:publicKey/:protocolID/:addressIndex/:address/:amount/:collectible/:forceMigration',
    canActivate: [ProtocolGuard, ServiceKeyGuard],

    loadChildren: () => import('./pages/transaction-prepare/transaction-prepare.module').then((m) => m.TransactionPreparePageModule)
  },
  {
    path: 'interaction-selection/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/interaction-selection/interaction-selection.module').then((m) => m.InteractionSelectionPageModule)
  },
  {
    path: 'transaction-qr/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/transaction-qr/transaction-qr.module').then((m) => m.TransactionQrPageModule)
  },
  {
    path: 'scan-address/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/scan-address/scan-address.module').then((m) => m.ScanAddressPageModule)
  },
  {
    path: 'exchange-confirm/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/exchange-confirm/exchange-confirm.module').then((m) => m.ExchangeConfirmPageModule)
  },
  {
    path: 'transaction-confirm/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/transaction-confirm/transaction-confirm.module').then((m) => m.TransactionConfirmPageModule)
  },
  {
    path: 'delegation-detail/:id/:publicKey/:protocolID/:addressIndex',
    canActivate: [ProtocolGuard, ServiceKeyGuard],

    loadChildren: () => import('./pages/delegation-detail/delegation-detail.module').then((m) => m.DelegationDetailPageModule)
  },
  {
    path: 'dapp-settings',
    loadChildren: () => import('./pages/dapp-settings/dapp-settings.module').then((m) => m.SettingsBeaconPageModule)
  },
  {
    path: 'delegation-list/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/delegation-list/delegation-list.module').then((m) => m.DelegationListPageModule)
  },
  {
    path: 'exchange-select',
    loadChildren: () => import('./pages/exchange-select/exchange-select.module').then((m) => m.ExchangeSelectPageModule)
  },
  {
    path: 'exchange-custom',
    loadChildren: () => import('./pages/exchange-custom/exchange-custom.module').then((m) => m.ExchangeCustomPageModule)
  },
  {
    path: 'ledger-sign/:id',
    resolve: {
      special: DataResolverService
    },
    canActivate: [ServiceKeyGuard],
    loadChildren: () => import('./pages/ledger-sign/ledger-sign.module').then((m) => m.LedgerSignPageModule)
  },
  {
    path: 'dapp-permission-list',
    loadChildren: () => import('./pages/dapp-permission-list/dapp-permission-list.module').then((m) => m.DappPermissionListPageModule)
  },
  {
    path: 'error',
    loadChildren: () => import('./pages/error/error.module').then((m) => m.ErrorPageModule)
  },
  {
    path: 'walletconnect',
    loadChildren: () => import('./pages/walletconnect/walletconnect.module').then((m) => m.WalletconnectPageModule)
  },
  {
    path: 'qr-settings',
    loadChildren: () => import('./pages/qr-settings/qr-settings.module').then((m) => m.QrSettingsPageModule)
  },
  {
    path: 'health-check',
    loadChildren: () => import('./pages/health-check/health-check.module').then((m) => m.HealthCheckPageModule)
  },
  {
    path: 'account-activate/:id/:protocolID',
    loadChildren: () => import('./pages/account-activate/account-activate.module').then((m) => m.AccountActivatePageModule)
  },
  {
    path: 'dapp-confirm',
    loadChildren: () => import('./pages/dapp-confirm/dapp-confirm.module').then((m) => m.DappConfirmPageModule)
  },

  {
    path: 'interaction-selection-settings',
    loadChildren: () =>
      import('./pages/interaction-selection-settings/interaction-selection-settings.module').then(
        (m) => m.InteractionSelectionSettingsPageModule
      )
  },
  {
    path: 'collectibles-list/:id/:publicKey/:protocolID/:addressIndex',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/collectibles-list/collectibles-list.module').then( m => m.CollectiblesListPageModule)
  },
  {
    path: 'collectibles-item/:id/:publicKey/:protocolID/:addressIndex/:collectible',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/collectibles-item/collectibles-item.module').then( m => m.CollectiblesItemPageModule)
  }
]
@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, relativeLinkResolution: 'corrected' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
