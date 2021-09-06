import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from 'src/app/components/components.module'
import { DappSettingsPageRoutingModule } from './dapp-settings-routing.module'

import { DappSettingsPage } from './dapp-settings.page'

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, DappSettingsPageRoutingModule, ComponentsModule],
  declarations: [DappSettingsPage]
})
export class SettingsBeaconPageModule {}
