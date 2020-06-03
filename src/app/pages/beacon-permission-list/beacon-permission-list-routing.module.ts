import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { BeaconPermissionListPage } from './beacon-permission-list.page'

const routes: Routes = [
  {
    path: '',
    component: BeaconPermissionListPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BeaconPermissionListPageRoutingModule {}
