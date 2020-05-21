import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { ComponentsModule } from 'src/app/components/components.module'

import { BeaconPermissionListPageRoutingModule } from './beacon-permission-list-routing.module'
import { BeaconPermissionListPage } from './beacon-permission-list.page'

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ComponentsModule, BeaconPermissionListPageRoutingModule],
  declarations: [BeaconPermissionListPage]
})
export class BeaconPermissionListPageModule {}
