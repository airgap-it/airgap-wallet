import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { SettingsBeaconPage } from './settings-beacon.page'

const routes: Routes = [
  {
    path: '',
    component: SettingsBeaconPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsBeaconPageRoutingModule {}
