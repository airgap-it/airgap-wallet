import { RouterModule } from '@angular/router'
import { ComponentsModule } from './../../components/components.module'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { ExchangeSelectPage } from './exchange-select.page'
import { TranslateModule } from '@ngx-translate/core'

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
  exports: [],
  entryComponents: [ExchangeSelectPage]
})
export class ExchangeSelectPageModule {}
