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
import { ExchangeAmountComponent } from './exchange-amount/exchange-amount'
import { ExchangeSelectCoinComponent } from './exchange-select-coin/exchange-select-coin'
import { ExchangeSelectWalletComponent } from './exchange-select-wallet/exchange-select-wallet'
import { ExchangeComponent } from './exchange/exchange'
import { SwapComponent } from './swap/swap'
import { CardActionableComponent } from './card-actionable/card-actionable'
import { EmptyStateComponent } from './empty-state/empty-state'
import { CurrencySymbolComponent } from './currency-symbol/currency-symbol'
import { QrClipboardComponent } from './qr-clipboard/qr-clipboard'
import { QRCodeModule } from 'angularx-qrcode'
import { SignedTransactionComponent } from './signed-transaction/signed-transaction'

@NgModule({
  declarations: [
    PortfolioItemComponent,
    IdenticonComponent,
    HexagonIconComponent,
    AddressRowComponent,
    FromToComponent,
    ExchangeAmountComponent,
    ExchangeSelectCoinComponent,
    ExchangeSelectWalletComponent,
    ExchangeComponent,
    SwapComponent,
    AccountEditPopoverComponent,
    CardActionableComponent,
    EmptyStateComponent,
    CurrencySymbolComponent,
    QrClipboardComponent,
    SignedTransactionComponent
  ],
  imports: [IonicModule, MaterialIconsModule, PipesModule, MomentModule, TranslateModule, QRCodeModule],
  exports: [
    PortfolioItemComponent,
    IdenticonComponent,
    HexagonIconComponent,
    AddressRowComponent,
    FromToComponent,
    ExchangeAmountComponent,
    ExchangeSelectCoinComponent,
    ExchangeSelectWalletComponent,
    ExchangeComponent,
    SwapComponent,
    AccountEditPopoverComponent,
    CardActionableComponent,
    EmptyStateComponent,
    CurrencySymbolComponent,
    QrClipboardComponent,
    SignedTransactionComponent
  ]
})
export class ComponentsModule {}
