import { RouterModule } from '@angular/router'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { TranslateModule } from '@ngx-translate/core'
import { ExchangeSelectPage } from './exchange-select.page'
import { ComponentsModule } from './../../components/components.module'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    RouterModule.forChild([{ path: '', component: ExchangeSelectPage }])
  ],
  declarations: [ExchangeSelectPage],
  exports: []
})
export class ExchangeSelectPageModule {}
