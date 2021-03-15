import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { HealthPage } from './health.page'

const routes: Routes = [
  {
    path: '',
    component: HealthPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HealthPageRoutingModule {}
