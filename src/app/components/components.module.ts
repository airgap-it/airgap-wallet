import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { QRCodeModule } from 'angularx-qrcode'
import { MaterialIconsModule } from 'ionic2-material-icons'
import { MomentModule } from 'ngx-moment'

import { PipesModule } from '../pipes/pipes.module'

import { AccountEditPopoverComponent } from './account-edit-popover/account-edit-popover.component'
import { AddressRowComponent } from './address-row/address-row'
import { CardActionableComponent } from './card-actionable/card-actionable'
import { CurrencyItemComponent } from './currency-item/currency-item'
import { CurrencySymbolComponent } from './currency-symbol/currency-symbol'
import { EmptyStateComponent } from './empty-state/empty-state'
import { FromToComponent } from './from-to/from-to'
import { HexagonIconComponent } from './hexagon-icon/hexagon-icon'
import { IdenticonComponent } from './identicon/identicon'
import { PortfolioItemComponent } from './portfolio-item/portfolio-item'
import { QrClipboardComponent } from './qr-clipboard/qr-clipboard'
import { SignedTransactionComponent } from './signed-transaction/signed-transaction'
import { SwapComponent } from './swap/swap'
import { TezosDelegationCard } from './tezos-delegation-card/tezos-delegation-card'
import { TezosDelegationStats } from './tezos-delegation-stats/tezos-delegation-stats'

@NgModule({
  declarations: [
    PortfolioItemComponent,
    IdenticonComponent,
    HexagonIconComponent,
    AddressRowComponent,
    FromToComponent,
    SwapComponent,
    AccountEditPopoverComponent,
    CardActionableComponent,
    EmptyStateComponent,
    CurrencySymbolComponent,
    QrClipboardComponent,
    SignedTransactionComponent,
    TezosDelegationStats,
    TezosDelegationCard,
    CurrencyItemComponent
  ],
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialIconsModule,
    PipesModule,
    MomentModule,
    TranslateModule,
    QRCodeModule
  ],
  exports: [
    PortfolioItemComponent,
    IdenticonComponent,
    HexagonIconComponent,
    AddressRowComponent,
    FromToComponent,
    SwapComponent,
    AccountEditPopoverComponent,
    CardActionableComponent,
    EmptyStateComponent,
    CurrencySymbolComponent,
    QrClipboardComponent,
    SignedTransactionComponent,
    TezosDelegationStats,
    TezosDelegationCard,
    CurrencyItemComponent
  ],
  entryComponents: [AccountEditPopoverComponent]
})
export class ComponentsModule {}
