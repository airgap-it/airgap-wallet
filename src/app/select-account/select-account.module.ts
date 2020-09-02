import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { SelectAccountPageRoutingModule } from './select-account-routing.module'

import { SelectAccountPage } from './select-account.page'

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SelectAccountPageRoutingModule],
  declarations: [SelectAccountPage]
})
export class SelectAccountPageModule {}
