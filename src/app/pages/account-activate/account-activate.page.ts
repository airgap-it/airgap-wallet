import { UIResource, UIResourceStatus } from '@airgap/angular-core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Store } from '@ngrx/store'
import { Observable } from 'rxjs'
import { first } from 'rxjs/operators'

import { AirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'

import * as actions from './account-activate.actions'
import * as fromAccountActivate from './account-activate.reducers'
import { createAccountId } from './account-activate.utils'

@Component({
  selector: 'app-account-activate',
  templateUrl: './account-activate.page.html',
  styleUrls: ['./account-activate.page.scss']
})
export class AccountActivatePage {
  public readonly protocolName$: Observable<UIResource<string>>
  public readonly inactiveAccounts$: Observable<UIResource<AirGapMarketWalletGroup[]>>
  public readonly isChecked$: Observable<Record<string, boolean>>

  public readonly createAccountId: typeof createAccountId = createAccountId
  public readonly UIResourceStatus: typeof UIResourceStatus = UIResourceStatus

  constructor(private readonly store: Store<fromAccountActivate.State>, private readonly route: ActivatedRoute) {
    this.protocolName$ = this.store.select(fromAccountActivate.selectProtocolName)
    this.inactiveAccounts$ = this.store.select(fromAccountActivate.selectInactiveAccounts)
    this.isChecked$ = this.store.select(fromAccountActivate.selectIsAccountChecked)
  }

  public ionViewWillEnter(): void {
    this.store.dispatch(actions.viewWillEnter({ routeParams: this.route.snapshot.params }))
  }

  public async toggleAccount(wallet: AirGapMarketWallet, event?: any): Promise<void> {
    const isChecked: boolean = (await this.isChecked$.pipe(first()).toPromise())[createAccountId(wallet)]
    if (event !== undefined && event.detail.checked === isChecked) {
      return
    }

    this.store.dispatch(actions.accountToggled({ protocolIdentifier: wallet.protocol.identifier, publicKey: wallet.publicKey }))
  }

  public add(): void {
    this.store.dispatch(actions.addButtonClicked())
  }
}
