import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { ComponentsModule } from 'src/app/components/components.module'
import { TranslateModule } from '@ngx-translate/core'

import { WalletconnectPageRoutingModule } from './walletconnect-routing.module'
import { WalletconnectPage } from './walletconnect.page'

@NgModule({
  imports: [
    AirGapAngularCoreModule,
    CommonModule,
    FormsModule,
    IonicModule,
    ComponentsModule,
    WalletconnectPageRoutingModule,
    TranslateModule
  ],
  declarations: [WalletconnectPage]
})
export class WalletconnectPageModule {}
