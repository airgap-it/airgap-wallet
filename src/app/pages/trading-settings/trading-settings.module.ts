import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { TradingSettingsPage } from './trading-settings.page'
import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from '@airgap/angular-core'
import { RouterModule } from '@angular/router'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ComponentsModule,
    TranslateModule,
    RouterModule.forChild([{ path: '', component: TradingSettingsPage }])
  ],
  declarations: [TradingSettingsPage]
})
export class TradingSettingsPageModule {}
