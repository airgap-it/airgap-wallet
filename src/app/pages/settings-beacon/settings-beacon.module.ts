import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { SettingsBeaconPageRoutingModule } from './settings-beacon-routing.module'

import { SettingsBeaconPage } from './settings-beacon.page'

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SettingsBeaconPageRoutingModule],
  declarations: [SettingsBeaconPage]
})
export class SettingsBeaconPageModule {}
