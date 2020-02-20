import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { DelegationPolkadotValidatorDetailPage } from './delegation-polkadot-validator-detail'
import { ComponentsModule } from 'src/app/components/components.module'
import { TranslateModule } from '@ngx-translate/core'
import { PipesModule } from 'src/app/pipes/pipes.module'
import { MomentModule } from 'ngx-moment'
import { RouterModule } from '@angular/router'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    MomentModule,
    RouterModule.forChild([{ path: '', component: DelegationPolkadotValidatorDetailPage }])
  ],
  declarations: [DelegationPolkadotValidatorDetailPage]
})
export class DelegationPolkadotValidatorDetailPageModule {}
