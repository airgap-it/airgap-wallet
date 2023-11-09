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

import { ComponentsModule } from '../../components/components.module'
import { PipesModule } from '../../pipes/pipes.module'

import { CollectiblesListPageRoutingModule } from './collectibles-list-routing.module'
import { CollectiblesListEffects } from './collectibles-list.effects'
import { CollectiblesListPage } from './collectibles-list.page'
import * as fromCollectiblesList from './collectibles-list.reducers'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    ComponentsModule,
    LetDirective,
    CollectiblesListPageRoutingModule,
    AirGapAngularCoreModule,
    AirGapAngularNgRxModule,
    PipesModule,
    StoreModule.forFeature('collectiblesList', fromCollectiblesList.reducer),
    EffectsModule.forFeature([CollectiblesListEffects]),
    EffectsModule.forRoot([])
  ],
  declarations: [CollectiblesListPage]
})
export class CollectiblesListPageModule {}
