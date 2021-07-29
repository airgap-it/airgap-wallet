import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { DappPermissionListPage } from './dapp-permission-list.page'

const routes: Routes = [
  {
    path: '',
    component: DappPermissionListPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DappPermissionListPageRoutingModule {}
