import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'

import { SettingsBeaconPageRoutingModule } from './settings-beacon-routing.module'
import { SettingsBeaconPage } from './settings-beacon.page'

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, SettingsBeaconPageRoutingModule],
  declarations: [SettingsBeaconPage]
})
export class SettingsBeaconPageModule {}
