import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { HealthCheckPage } from './health-check.page'

const routes: Routes = [
  {
    path: '',
    component: HealthCheckPage
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HealthCheckPageRoutingModule {}
