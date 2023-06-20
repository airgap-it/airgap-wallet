import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { TranslateModule } from '@ngx-translate/core'
import { HealthCheckPageRoutingModule } from './health-check-routing.module'

import { HealthCheckPage } from './health-check.page'

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, HealthCheckPageRoutingModule],
  declarations: [HealthCheckPage]
})
export class HealthCheckPageModule {}
