// import { AirGapAngularCoreModule } from '@airgap/angular-core'
// import { AirGapAngularNgRxModule } from '@airgap/angular-ngrx'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { EffectsModule } from '@ngrx/effects'
import { StoreModule } from '@ngrx/store'
import { TranslateModule } from '@ngx-translate/core'

import { ComponentsModule } from '../../components/components.module'
import { PipesModule } from '../../pipes/pipes.module'

import { AccountActivatePageRoutingModule } from './account-activate-routing.module'
import { AccountActivateEffects } from './account-activate.effects'
import { AccountActivatePage } from './account-activate.page'
import * as fromAccountActivate from './account-activate.reducers'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    ComponentsModule,
    PipesModule,
    AccountActivatePageRoutingModule,
    // AirGapAngularCoreModule,
    // AirGapAngularNgRxModule,
    StoreModule.forFeature('accountActivate', fromAccountActivate.reducer),
    EffectsModule.forFeature([AccountActivateEffects])
  ],
  declarations: [AccountActivatePage]
})
export class AccountActivatePageModule {}
