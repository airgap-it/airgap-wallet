import { ICoinDelegateProtocol } from 'airgap-coin-lib'
import { UIWidget } from '../models/widgets/UIWidget'
import { UIInputWidget } from '../models/widgets/UIInputWidget'
import BigNumber from 'bignumber.js'
import { DelegateeDetails, DelegatorDetails } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { FormGroup } from '@angular/forms'
import { UIRewardList } from '../models/widgets/display/UIRewardList'
import { UIAccountSummary } from '../models/widgets/display/UIAccountSummary'
import { UIAccountExtendedDetails } from '../models/widgets/display/UIAccountExtendedDetails'

export interface AirGapDelegateeUsageDetails {
  usage: BigNumber
  current: BigNumber
  total: BigNumber
}

export interface AirGapDelegatorAction {
  type: any
  form?: FormGroup
  label: string
  confirmLabel?: string
  iconName?: string
  args?: UIInputWidget<any>[]
  description?: string
}

export interface AirGapDelegateeDetails extends DelegateeDetails {
  usageDetails?: AirGapDelegateeUsageDetails
  displayDetails?: UIWidget[]
}

export interface AirGapDelegatorDetails extends DelegatorDetails {
  mainActions?: AirGapDelegatorAction[]
  secondaryActions?: AirGapDelegatorAction[]
  displayDetails?: UIWidget[]
  displayRewards?: UIRewardList
}

export interface AirGapRewardDisplayDetails {
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
  getRewardDisplayDetails(delegator: string, delegatees: string[]): Promise<AirGapRewardDisplayDetails | undefined>
  getExtraDelegationDetailsFromAddress(delegator: string, delegatees: string[]): Promise<AirGapDelegationDetails[]>
  createDelegateesSummary(delegatees: string[]): Promise<UIAccountSummary[]>
  createAccountExtendedDetails(address: string): Promise<UIAccountExtendedDetails>
}
