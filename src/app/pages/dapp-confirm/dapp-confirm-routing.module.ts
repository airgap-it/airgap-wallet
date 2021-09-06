import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { DappConfirmPage } from './dapp-confirm.page'

const routes: Routes = [
  {
    path: '',
    component: DappConfirmPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DappConfirmPageRoutingModule {}
