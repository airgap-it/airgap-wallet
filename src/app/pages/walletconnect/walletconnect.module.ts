import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { ComponentsModule } from 'src/app/components/components.module'

import { WalletconnectPageRoutingModule } from './walletconnect-routing.module'
import { WalletconnectPage } from './walletconnect.page'

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ComponentsModule, WalletconnectPageRoutingModule],
  declarations: [WalletconnectPage]
})
export class WalletconnectPageModule {}
