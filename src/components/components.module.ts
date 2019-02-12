import { NgModule } from '@angular/core'
import { IonicModule } from 'ionic-angular'
import { MaterialIconsModule } from 'ionic2-material-icons'
import { TranslateModule } from '@ngx-translate/core'

import { PipesModule } from '../pipes/pipes.module'

import { AddressRowComponent } from './address-row/address-row'
import { FromToComponent } from './from-to/from-to'
import { HexagonIconComponent } from './hexagon-icon/hexagon-icon'
import { IdenticonComponent } from './identicon/identicon'
import { PortfolioItemComponent } from './portfolio-item/portfolio-item'
import { AccountEditPopoverComponent } from './account-edit-popover/account-edit-popover.component'
import { MomentModule } from 'ngx-moment'
import { CardActionableComponent } from './card-actionable/card-actionable'

@NgModule({
  declarations: [
    PortfolioItemComponent,
    IdenticonComponent,
    HexagonIconComponent,
    AddressRowComponent,
    FromToComponent,
    AccountEditPopoverComponent,
    CardActionableComponent
  ],
  imports: [IonicModule, MaterialIconsModule, PipesModule, MomentModule, TranslateModule],
  exports: [
    PortfolioItemComponent,
    IdenticonComponent,
    HexagonIconComponent,
    AddressRowComponent,
    FromToComponent,
    AccountEditPopoverComponent,
    CardActionableComponent
  ]
})
export class ComponentsModule {}
