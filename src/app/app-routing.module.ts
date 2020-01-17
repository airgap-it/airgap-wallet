import { NgModule } from '@angular/core'
import { PreloadAllModules, RouterModule, Routes } from '@angular/router'

import { DataResolverService } from './services/resolver/data-resolver.service'

const routes: Routes = [
  { path: '', loadChildren: () => import('./pages/tabs/tabs.module').then(m => m.TabsPageModule) },
  { path: 'about', loadChildren: () => import('./pages/about/about.module').then(m => m.AboutPageModule) },
  {
    path: 'account-add',
    loadChildren: () => import('./pages/account-add/account-add.module').then(m => m.AccountAddPageModule)
  },
  {
    path: 'account-import-onboarding/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () =>
      import('./pages/account-import-onboarding/account-import-onboarding.module').then(m => m.AccountImportOnboardingPageModule)
  },
  {
    path: 'select-wallet/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/select-wallet/select-wallet.module').then(m => m.SelectWalletPageModule)
  },
  {
    path: 'account-import/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/account-import/account-import.module').then(m => m.AccountImportPageModule)
  },
  {
    path: 'account-transaction-list/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () =>
      import('./pages/account-transaction-list/account-transaction-list.module').then(m => m.AccountTransactionListPageModule)
  },
  {
    path: 'transaction-detail/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/transaction-detail/transaction-detail.module').then(m => m.TransactionDetailPageModule)
  },
  {
    path: 'sub-account-add/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/sub-account-add/sub-account-add.module').then(m => m.SubAccountAddPageModule)
  },
  {
    path: 'sub-account-select/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/sub-account-select/sub-account-select.module').then(m => m.SubAccountSelectPageModule)
  },
  {
    path: 'sub-account-import/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/sub-account-import/sub-account-import.module').then(m => m.SubAccountImportPageModule)
  },
  {
    path: 'account-address/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/account-address/account-address.module').then(m => m.AccountAddressPageModule)
  },
  {
    path: 'transaction-prepare/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/transaction-prepare/transaction-prepare.module').then(m => m.TransactionPreparePageModule)
  },
  {
    path: 'interaction-selection/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/interaction-selection/interaction-selection.module').then(m => m.InteractionSelectionPageModule)
  },
  {
    path: 'transaction-qr/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/transaction-qr/transaction-qr.module').then(m => m.TransactionQrPageModule)
  },
  {
    path: 'scan-address/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/scan-address/scan-address.module').then(m => m.ScanAddressPageModule)
  },
  {
    path: 'exchange-confirm/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/exchange-confirm/exchange-confirm.module').then(m => m.ExchangeConfirmPageModule)
  },
  {
    path: 'transaction-confirm/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/transaction-confirm/transaction-confirm.module').then(m => m.TransactionConfirmPageModule)
  },
  {
    path: 'delegation-baker-detail/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () =>
      import('./pages/delegation-baker-detail/delegation-baker-detail.module').then(m => m.DelegationBakerDetailPageModule)
  },
  {
    path: 'delegation-cosmos/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () => import('./pages/delegation-cosmos/delegation-cosmos.module').then(m => m.DelegationCosmosPageModule)
  },
  {
    path: 'delegation-validator-list/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: () =>
      import('./pages/delegation-validator-list/delegation-validator-list.module').then(m => m.DelegationValidatorListPageModule)
  },
  {
    path: 'beacon-request',
    loadChildren: () => import('./pages/beacon-request/beacon-request.module').then(m => m.BeaconRequestPageModule)
  },
  {
    path: 'settings-beacon',
    loadChildren: () => import('./pages/settings-beacon/settings-beacon.module').then(m => m.SettingsBeaconPageModule)
  }
]
@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
