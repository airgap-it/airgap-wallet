import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { AirGapAngularNgRxModule } from '@airgap/angular-ngrx'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { ReactiveComponentModule } from '@ngrx/component'
import { TranslateModule } from '@ngx-translate/core'
import { QRCodeModule } from 'angularx-qrcode'
import { ChartsModule } from 'ng2-charts'
import { MomentModule } from 'ngx-moment'
import { PipesModule } from '../pipes/pipes.module'
import { AccountEditPopoverComponent } from './account-edit-popover/account-edit-popover.component'
import { AmountComponent } from './amount/amount.component'
import { CardActionableComponent } from './card-actionable/card-actionable'
import { ChartComponent } from './chart/chart.component'
import { CurrencyItemComponent } from './currency-item/currency-item'
import { CurrentWalletGroupComponent } from './current-wallet-group/current-wallet-group.component'
import { DappPeerComponent } from './dapp-peer/dapp-peer.component'
import { DelegateActionPopoverComponent } from './delegate-action-popover/delegate-action-popover.component'
import { DelegateEditPopoverComponent } from './delegate-edit-popover/delegate-edit-popover.component'
import { EmptyStateComponent } from './empty-state/empty-state'
import { ExchangeSelectionComponent } from './exchange-selection/exchange-selection.component'
import { FeeComponent } from './fee/fee.component'
import { FromToComponent } from './from-to/from-to.component'
import { InteractionSelectionComponent } from './interaction-selection/interaction-selection.component'
import { PermissionRequestComponent } from './permission-request/permission-request.component'
import { PortfolioItemComponent } from './portfolio-item/portfolio-item'
import { RemoveLiquidityComponent } from './remove-liquidity/remove-liquidity.component'
import { SignedTransactionComponent } from './signed-transaction/signed-transaction'
import { SwapComponent } from './swap/swap'
import { TezosDelegationCard } from './tezos-delegation-card/tezos-delegation-card'
import { TezosFAForm } from './tezos-fa-form/tezos-fa-form.component'
import { TezosSaplingContractForm } from './tezos-sapling-contract-form/tezos-sapling-contract-form.component'
import { TransactionItemComponent } from './transaction-item/transaction-item.component'
import { TransactionListComponent } from './transaction-list/transaction-list.component'
import { WalletconnectFromToComponent } from './walletconnect-from-to/walletconnect-from-to.component'
import { WidgetAccountExtendedDetails } from './widget-account-extended-details/widget-account-extended-details'
import { WidgetAccountSummary } from './widget-account-summary/widget-account-summary'
import { WidgetAccount } from './widget-account/widget-account'
import { WidgetAlert } from './widget-alert/widget-alert'
import { WidgetIconText } from './widget-icon-text/widget-icon-text'
import { WidgetInputDelay } from './widget-input-delay/widget-input-delay'
import { WidgetInputText } from './widget-input-text/widget-input-text'
import { WidgetOptionButtonGroup } from './widget-option-button-group/widget-option-button-group'
import { WidgetRewardList } from './widget-reward-list/widget-reward-list'
import { WidgetSelector } from './widget-selector/widget-selector'

@NgModule({
  declarations: [
    PortfolioItemComponent,
    ChartComponent,
    SwapComponent,
    AccountEditPopoverComponent,
    AmountComponent,
    CardActionableComponent,
    EmptyStateComponent,
    SignedTransactionComponent,
    TezosDelegationCard,
    TezosFAForm,
    TezosSaplingContractForm,
    CurrencyItemComponent,
    DelegateActionPopoverComponent,
    DelegateEditPopoverComponent,
    PermissionRequestComponent,
    CurrentWalletGroupComponent,
    DappPeerComponent,
    TransactionListComponent,
    TransactionItemComponent,
    FeeComponent,
    FromToComponent,
    WalletconnectFromToComponent,
    InteractionSelectionComponent,
    WidgetSelector,
    WidgetAccount,
    WidgetAccountSummary,
    WidgetAccountExtendedDetails,
    WidgetAlert,
    WidgetIconText,
    WidgetInputDelay,
    WidgetInputText,
    WidgetRewardList,
    WidgetOptionButtonGroup,
    RemoveLiquidityComponent,
    ExchangeSelectionComponent
  ],
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ReactiveComponentModule,

    PipesModule,
    MomentModule,
    ChartsModule,
    TranslateModule,
    QRCodeModule,
    AirGapAngularCoreModule,
    AirGapAngularNgRxModule
  ],
  exports: [
    PortfolioItemComponent,
    ChartComponent,
    AmountComponent,
    SwapComponent,
    AccountEditPopoverComponent,
    CardActionableComponent,
    EmptyStateComponent,
    SignedTransactionComponent,
    TezosDelegationCard,
    TezosFAForm,
    TezosSaplingContractForm,
    CurrencyItemComponent,
    DelegateEditPopoverComponent,
    PermissionRequestComponent,
    CurrentWalletGroupComponent,
    DappPeerComponent,
    WalletconnectFromToComponent,
    InteractionSelectionComponent,
    TransactionListComponent,
    TransactionItemComponent,
    FeeComponent,
    FromToComponent,
    WidgetSelector,
    WidgetAccount,
    WidgetAccountSummary,
    WidgetAccountExtendedDetails,
    WidgetAlert,
    WidgetIconText,
    WidgetInputDelay,
    WidgetInputText,
    WidgetRewardList,
    WidgetOptionButtonGroup,
    RemoveLiquidityComponent,
    ExchangeSelectionComponent
  ],
  entryComponents: [
    AccountEditPopoverComponent,
    DelegateEditPopoverComponent,
    DappPeerComponent,
    RemoveLiquidityComponent,
    ExchangeSelectionComponent
  ]
})
export class ComponentsModule {}
