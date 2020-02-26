import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { ExchangeCustomPage } from './exchange-custom.page'
import { ComponentsModule } from 'src/app/components/components.module'
import { TranslateModule } from '@ngx-translate/core'
import { PipesModule } from 'src/app/pipes/pipes.module'
import { MomentModule } from 'ngx-moment'
import { RouterModule } from '@angular/router'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    MomentModule,
    RouterModule.forChild([{ path: '', component: ExchangeCustomPage }])
  ],
  declarations: [ExchangeCustomPage]
})
export class ExchangeCustomPageModule {}
