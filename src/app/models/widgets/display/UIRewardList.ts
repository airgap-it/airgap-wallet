import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'
import { DelegatorReward } from '@airgap/coinlib-core/protocols/ICoinDelegateProtocol'

export interface UIRewardListConfig extends UIWidgetConfig {
  rewards: DelegatorReward[]

  indexColLabel: string
  amountColLabel: string
  payoutColLabel: string
}

export class UIRewardList extends UIWidget {
  public type: UIWidgetType = UIWidgetType.REWARD_LIST

  public rewards: DelegatorReward[]

  public indexColLabel: string
  public amountColLabel: string
  public payoutColLabel: string

  public constructor(config: UIRewardListConfig) {
    super(config)

    this.rewards = config.rewards

    this.indexColLabel = config.indexColLabel
    this.amountColLabel = config.amountColLabel
    this.payoutColLabel = config.payoutColLabel
  }
}
