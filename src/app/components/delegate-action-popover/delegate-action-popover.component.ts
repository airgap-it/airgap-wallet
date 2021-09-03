import { Component } from '@angular/core'
import { NavParams, PopoverController } from '@ionic/angular'
import { AirGapDelegatorAction } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'

@Component({
  selector: 'app-delegate-action-popover',
  templateUrl: './delegate-action-popover.component.html',
  styleUrls: ['./delegate-action-popover.component.scss']
})
export class DelegateActionPopoverComponent {
  public readonly hideAirGap: boolean
  public readonly delegateeLabel: string
  public readonly secondaryDelegatorActions: AirGapDelegatorAction[]

  constructor(private readonly popoverController: PopoverController, private readonly navParams: NavParams) {
    const hideAirGap: boolean | undefined = this.navParams.get('hideAirGap')
    const delegateeLabel: string | undefined = this.navParams.get('delegateeLabel')
    const secondaryDelegatorActions: AirGapDelegatorAction[] | undefined = this.navParams.get('secondaryDelegatorActions')

    this.hideAirGap = hideAirGap !== undefined ? hideAirGap : true
    this.delegateeLabel = delegateeLabel !== undefined ? delegateeLabel : 'delegation-detail.default-delegatee-label'
    this.secondaryDelegatorActions = secondaryDelegatorActions !== undefined ? secondaryDelegatorActions : []
  }

  public changeDelegateeToAirGap(): void {
    this.popoverController.dismiss({ changeToAirGap: true })
  }

  public callSecondaryAction(type: string): void {
    this.popoverController.dismiss({ secondaryActionType: type })
  }
}
