import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from '@airgap/angular-core'
import { RouterModule } from '@angular/router'
import { InteractionSelectionSettingsPage } from './interaction-selection-settings.page'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ComponentsModule,
    TranslateModule,
    RouterModule.forChild([{ path: '', component: InteractionSelectionSettingsPage }])
  ],
  declarations: [InteractionSelectionSettingsPage]
})
export class InteractionSelectionSettingsPageModule {}
