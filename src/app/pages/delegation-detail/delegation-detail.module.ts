import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'
import { MomentModule } from 'ngx-moment'
import { ComponentsModule } from 'src/app/components/components.module'
import { PipesModule } from 'src/app/pipes/pipes.module'
import { DelegationDetailPage } from './delegation-detail'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    MomentModule,
    RouterModule.forChild([{ path: '', component: DelegationDetailPage }]),
    AirGapAngularCoreModule
  ],
  declarations: [DelegationDetailPage]
})
export class DelegationDetailPageModule {}
