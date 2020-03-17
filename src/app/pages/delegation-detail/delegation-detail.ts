import { Component } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ActivatedRoute } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapMainDelegatorAction,
  AirGapExtraDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { supportsDelegation, supportsAirGapDelegation } from 'src/app/helpers/delegation'
import { FormGroup, FormBuilder } from '@angular/forms'

@Component({
  selector: 'app-delegation-detail',
  templateUrl: './delegation-detail.html',
  styleUrls: ['./delegation-detail.scss']
})
export class DelegationDetailPage {
  public delegateActionId: string = 'delegate'
  public delegateButton: string = 'Delegate'

  public undelegateActionId: string = 'undelegate'
  public undelegateButton: string = 'Undelegate'

  public wallet: AirGapMarketWallet

  public delegationForms: Map<string, FormGroup> = new Map()

  public delegateeLabel: string

  public activeDelegatorAction: string | null = null
  public activeDelegatorActionConfirmButton: string | null = null

  public delegateeDetails$: BehaviorSubject<AirGapDelegateeDetails> = new BehaviorSubject(null)
  public delegatorDetails$: BehaviorSubject<AirGapDelegatorDetails> = new BehaviorSubject(null)

  private readonly delegateeAddress$: BehaviorSubject<string> = new BehaviorSubject(null)

  constructor(
    private readonly operations: OperationsProvider,
    private readonly route: ActivatedRoute,
    private readonly formBuilder: FormBuilder
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
    }

    this.delegateeLabel = supportsAirGapDelegation(this.wallet.coinProtocol) ? this.wallet.coinProtocol.delegateeLabel : 'Delegation'

    if (supportsDelegation(this.wallet.coinProtocol)) {
      this.subscribeObservables()

      this.operations
        .getCurrentDelegatee(this.wallet.coinProtocol, this.wallet.receivingPublicAddress)
        .then(address => this.delegateeAddress$.next(address))

      this.operations
        .getDelegatorDetails(this.wallet.coinProtocol, this.wallet.receivingPublicAddress)
        .then(details => this.delegatorDetails$.next(details))
    }
  }

  public async presentEditPopover(event: Event): Promise<void> {
    console.log(event)
    // TODO: select new delegatee
  }

  public async callAction(): Promise<void> {
    const delegatorDetails = this.delegatorDetails$.value
    if (!delegatorDetails) {
      return
    }

    let actionType: any
    switch (this.activeDelegatorAction) {
      case this.delegateActionId:
        actionType = delegatorDetails.delegateAction.type
        break
      case this.undelegateActionId:
        actionType = delegatorDetails.undelegateAction.type
        break
      default:
        actionType = delegatorDetails.extraActions.find(action => action.type.toString() === this.activeDelegatorAction).type
    }
    const data = this.delegationForms[actionType].value
    console.log(data)
    const delegatorAction = this.operations.prepareDelegatorAction(this.wallet, actionType, data)
    console.log(delegatorAction)
  }

  public onActiveActionChange() {
    switch (this.activeDelegatorAction) {
      case this.delegateActionId:
        this.activeDelegatorActionConfirmButton = this.delegateButton
        break
      case this.undelegateActionId:
        this.activeDelegatorActionConfirmButton = this.undelegateButton
        break
      default:
        const activeAction = this.delegatorDetails$.value.extraActions
          ? this.delegatorDetails$.value.extraActions.find(action => action.type.toString() === this.activeDelegatorAction)
          : null

        this.activeDelegatorActionConfirmButton = activeAction.confirmLabel
    }
  }

  private subscribeObservables() {
    this.delegateeAddress$.subscribe(address => {
      if (address && supportsDelegation(this.wallet.coinProtocol)) {
        this.operations.getDelegateeDetails(this.wallet.coinProtocol, address).then(details => this.delegateeDetails$.next(details))
        this.setupMainActionsForms(this.delegatorDetails$.value)
      }
    })

    this.delegatorDetails$.subscribe(details => {
      if (!details) {
        return
      }
      this.setupForms(details)
      this.setActiveDelegatorAction(details)
    })
  }

  private setupForms(details: AirGapDelegatorDetails) {
    this.setupMainActionsForms(details)
    this.setupExtraActionsForms(details)
  }

  private setupMainActionsForms(details: AirGapDelegatorDetails) {
    const mainActions: AirGapMainDelegatorAction[] = [details.delegateAction, details.undelegateAction]

    mainActions.forEach(action => {
      if (action && action.type !== undefined && action.isAvailable && (action.paramName || action.extraArgs)) {
        const args = {}
        if (action.paramName) {
          args[action.paramName] = this.delegateeAddress$.value
        }
        if (action.extraArgs) {
          action.extraArgs.forEach(arg => (args[arg.id] = ''))
        }

        this.delegationForms[action.type] = this.formBuilder.group(args)
      }
    })
  }

  private setupExtraActionsForms(details: AirGapDelegatorDetails) {
    const extraActions: AirGapExtraDelegatorAction[] = details.extraActions

    extraActions.forEach(action => {
      if (action.args) {
        const args = {}
        action.args.forEach(arg => (args[arg.id] = ''))

        this.delegationForms[action.type] = this.formBuilder.group(args)
      }
    })
  }

  private setActiveDelegatorAction(details: AirGapDelegatorDetails) {
    if (details.delegateAction.isAvailable) {
      this.activeDelegatorAction = this.delegateActionId
      this.activeDelegatorActionConfirmButton = this.delegateButton
    } else if (details.undelegateAction.isAvailable) {
      this.activeDelegatorAction = this.undelegateActionId
      this.activeDelegatorActionConfirmButton = this.undelegateButton
    } else {
      const activeAction = details.extraActions ? details.extraActions[0] : null

      this.activeDelegatorAction = activeAction.type
      this.activeDelegatorActionConfirmButton = activeAction.confirmLabel
    }
  }
}
