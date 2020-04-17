import { ICoinDelegateProtocol } from 'airgap-coin-lib'
import { UIWidget } from '../models/widgets/UIWidget'
import { UIInputWidget } from '../models/widgets/UIInputWidget'
import BigNumber from 'bignumber.js'
import { DelegateeDetails, DelegatorDetails } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { FormGroup } from '@angular/forms'
import { UIRewardList } from '../models/widgets/display/UIRewardList'

export interface AirGapDelegateeUsageDetails {
  usage: BigNumber
  current: BigNumber
  total: BigNumber
}

export interface AirGapMainDelegatorAction {
  type?: any
  isAvailable: boolean
  description?: string
  form?: FormGroup
  extraArgs?: UIInputWidget<any>[]
}

export interface AirGapExtraDelegatorAction {
  type: any
  label: string
  confirmLabel: string
  description?: string
  form?: FormGroup
  args?: UIInputWidget<any>[]
}

export interface AirGapDelegateeDetails extends DelegateeDetails {
  usageDetails: AirGapDelegateeUsageDetails
  displayDetails?: UIWidget[]
}

export interface AirGapDelegatorDetails extends DelegatorDetails {
  delegateAction: AirGapMainDelegatorAction
  undelegateAction: AirGapMainDelegatorAction
  extraActions?: AirGapExtraDelegatorAction[]
  displayDetails?: UIWidget[]
  displayRewards?: UIRewardList
}

export interface AirGapDelegationDetails {
  delegator: AirGapDelegatorDetails
  delegatees: AirGapDelegateeDetails[]
}

export interface IAirGapCoinDelegateProtocol extends ICoinDelegateProtocol {
  airGapDelegatee?: string
  delegateeLabel: string

  getExtraDelegationDetailsFromAddress(delegator: string, delegatees: string[]): Promise<AirGapDelegationDetails[]>
}
