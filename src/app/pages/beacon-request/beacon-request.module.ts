import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { MomentModule } from 'ngx-moment'
import { ComponentsModule } from 'src/app/components/components.module'
import { PipesModule } from 'src/app/pipes/pipes.module'

import { BeaconRequestPageRoutingModule } from './beacon-request-routing.module'
import { BeaconRequestPage } from './beacon-request.page'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    MomentModule,
    BeaconRequestPageRoutingModule,
    AirGapAngularCoreModule
  ],
  declarations: [BeaconRequestPage]
})
export class BeaconRequestPageModule {}
