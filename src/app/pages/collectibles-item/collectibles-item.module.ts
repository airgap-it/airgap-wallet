import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { AirGapAngularNgRxModule } from '@airgap/angular-ngrx'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { LetDirective } from '@ngrx/component'
import { EffectsModule } from '@ngrx/effects'
import { StoreModule } from '@ngrx/store'
import { TranslateModule } from '@ngx-translate/core'

import { PipesModule } from '../../pipes/pipes.module'

import { CollectiblesItemPageRoutingModule } from './collectibles-item-routing.module'
import { CollectiblesItemEffects } from './collectibles-item.effects'
import { CollectiblesItemPage } from './collectibles-item.page'
import * as fromCollectiblesItem from './collectibles-item.reducers'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    LetDirective,
    PipesModule,
    CollectiblesItemPageRoutingModule,
    AirGapAngularCoreModule,
    AirGapAngularNgRxModule,
    StoreModule.forFeature('collectiblesItem', fromCollectiblesItem.reducer),
    EffectsModule.forFeature([CollectiblesItemEffects]),
    EffectsModule.forRoot([])
  ],
  declarations: [CollectiblesItemPage]
})
export class CollectiblesItemPageModule {}
