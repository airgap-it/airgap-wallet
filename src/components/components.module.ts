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
import { WalletEditPopoverComponent } from './wallet-edit-popover/wallet-edit-popover.component'
import { MomentModule } from 'ngx-moment'
import { ExchangeAmountComponent } from './exchange-amount/exchange-amount'
import { ExchangeSelectCoinComponent } from './exchange-select-coin/exchange-select-coin'
import { ExchangeSelectWalletComponent } from './exchange-select-wallet/exchange-select-wallet'
import { ExchangeComponent } from './exchange/exchange'

@NgModule({
  declarations: [
    PortfolioItemComponent,
    IdenticonComponent,
    HexagonIconComponent,
    AddressRowComponent,
    FromToComponent,
    WalletEditPopoverComponent,
    ExchangeAmountComponent,
    ExchangeSelectCoinComponent,
    ExchangeSelectWalletComponent,
    ExchangeComponent
  ],
  imports: [IonicModule, MaterialIconsModule, PipesModule, MomentModule, TranslateModule],
  exports: [
    PortfolioItemComponent,
    IdenticonComponent,
    HexagonIconComponent,
    AddressRowComponent,
    FromToComponent,
    WalletEditPopoverComponent,
    ExchangeAmountComponent,
    ExchangeSelectCoinComponent,
    ExchangeSelectWalletComponent,
    ExchangeComponent
  ]
})
export class ComponentsModule {}
