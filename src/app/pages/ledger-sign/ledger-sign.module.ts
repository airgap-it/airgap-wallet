import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from 'src/app/components/components.module'
import { PipesModule } from 'src/app/pipes/pipes.module'

import { LedgerSignPage } from './ledger-sign'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    AirGapAngularCoreModule,
    RouterModule.forChild([{ path: '', component: LedgerSignPage }])
  ],
  declarations: [LedgerSignPage]
})
export class LedgerSignPageModule {}
