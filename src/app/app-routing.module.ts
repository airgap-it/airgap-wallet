import { NgModule } from '@angular/core'
import { PreloadAllModules, RouterModule, Routes } from '@angular/router'

import { DataResolverService } from './services/resolver/data-resolver.service'

const routes: Routes = [
  { path: '', loadChildren: './pages/tabs/tabs.module#TabsPageModule' },
  { path: 'about', loadChildren: './pages/about/about.module#AboutPageModule' },
  {
    path: 'account-add',
    loadChildren: './pages/account-add/account-add.module#AccountAddPageModule'
  },
  {
    path: 'account-import-onboarding/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/account-import-onboarding/account-import-onboarding.module#AccountImportOnboardingPageModule'
  },
  {
    path: 'select-wallet/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/select-wallet/select-wallet.module#SelectWalletPageModule'
  },
  {
    path: 'account-import/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/account-import/account-import.module#AccountImportPageModule'
  },
  {
    path: 'account-transaction-list/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/account-transaction-list/account-transaction-list.module#AccountTransactionListPageModule'
  },
  {
    path: 'transaction-detail/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/transaction-detail/transaction-detail.module#TransactionDetailPageModule'
  },
  {
    path: 'sub-account-add/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/sub-account-add/sub-account-add.module#SubAccountAddPageModule'
  },
  {
    path: 'sub-account-select/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/sub-account-select/sub-account-select.module#SubAccountSelectPageModule'
  },
  {
    path: 'sub-account-import/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/sub-account-import/sub-account-import.module#SubAccountImportPageModule'
  },
  {
    path: 'account-address/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/account-address/account-address.module#AccountAddressPageModule'
  },
  {
    path: 'transaction-prepare/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/transaction-prepare/transaction-prepare.module#TransactionPreparePageModule'
  },
  {
    path: 'interaction-selection/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/interaction-selection/interaction-selection.module#InteractionSelectionPageModule'
  },
  {
    path: 'transaction-qr/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/transaction-qr/transaction-qr.module#TransactionQrPageModule'
  },
  {
    path: 'scan-address/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/scan-address/scan-address.module#ScanAddressPageModule'
  },
  {
    path: 'exchange-confirm/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/exchange-confirm/exchange-confirm.module#ExchangeConfirmPageModule'
  },
  {
    path: 'transaction-confirm/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/transaction-confirm/transaction-confirm.module#TransactionConfirmPageModule'
  },
  {
    path: 'delegation-baker-detail/:id',
    resolve: {
      special: DataResolverService
    },
    loadChildren: './pages/delegation-baker-detail/delegation-baker-detail.module#DelegationBakerDetailPageModule'
  }
]
@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
