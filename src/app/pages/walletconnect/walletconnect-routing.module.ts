import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { WalletconnectPage } from './walletconnect.page'

const routes: Routes = [
  {
    path: '',
    component: WalletconnectPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WalletconnectPageRoutingModule {}
