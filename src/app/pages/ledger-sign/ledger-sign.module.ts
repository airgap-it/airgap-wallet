import { NgModule } from '@angular/core'
import { IonicModule } from '@ionic/angular'
import { CommonModule } from '@angular/common'
import { ComponentsModule } from 'src/app/components/components.module'
import { TranslateModule } from '@ngx-translate/core'
import { RouterModule } from '@angular/router'
import { PipesModule } from 'src/app/pipes/pipes.module'

import { LedgerSignPage } from './ledger-sign'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    RouterModule.forChild([{ path: '', component: LedgerSignPage }])
  ],
  declarations: [LedgerSignPage]
})
export class LedgerSignPageModule {}
