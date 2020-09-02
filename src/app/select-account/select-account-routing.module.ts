import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { SelectAccountPage } from './select-account.page'

const routes: Routes = [
  {
    path: '',
    component: SelectAccountPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SelectAccountPageRoutingModule {}
