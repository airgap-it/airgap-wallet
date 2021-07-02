import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { DappConfirmPageRoutingModule } from './dapp-confirm-routing.module'

import { DappConfirmPage } from './dapp-confirm.page'
import { TranslateModule } from '@ngx-translate/core'

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, DappConfirmPageRoutingModule],
  declarations: [DappConfirmPage]
})
export class DappConfirmPageModule {}
