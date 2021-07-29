import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from 'src/app/components/components.module'

import { DappPermissionListPageRoutingModule } from './dapp-permission-list-routing.module'
import { DappPermissionListPage } from './dapp-permission-list.page'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    ComponentsModule,
    DappPermissionListPageRoutingModule,
    AirGapAngularCoreModule
  ],
  declarations: [DappPermissionListPage]
})
export class DappPermissionListPageModule {}
