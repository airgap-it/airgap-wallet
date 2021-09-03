import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { DappSettingsPage } from './dapp-settings.page'

const routes: Routes = [
  {
    path: '',
    component: DappSettingsPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DappSettingsPageRoutingModule {}
