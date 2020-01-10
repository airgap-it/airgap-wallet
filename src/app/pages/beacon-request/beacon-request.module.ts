import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { BeaconRequestPageRoutingModule } from './beacon-request-routing.module'

import { BeaconRequestPage } from './beacon-request.page'
import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from 'src/app/components/components.module'
import { PipesModule } from 'src/app/pipes/pipes.module'
import { MomentModule } from 'ngx-moment'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    MomentModule,
    BeaconRequestPageRoutingModule
  ],
  declarations: [BeaconRequestPage]
})
export class BeaconRequestPageModule {}
