import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'

export interface Uptime {
  address: string
  missed_blocks: number
  over_blocks: number
}

export interface ValidatorInfos {
  rate: string
  status: string
  totalDelegationBalance: string
}

export interface CosmosValidatorObject {
  rank: number
  operator_address: string
  consensus_pubkey: string
  jailed: boolean
  status: number
  tokens: string
  delegator_shares: string
  moniker: string
  identity: string
  website: string
  details: string
  unbonding_height: string
  unbonding_time: Date
  rate: string
  max_rate: string
  max_change_rate: string
  update_time: Date
  uptime: Uptime
  min_self_delegation: string
  keybase_url: string
}

@Injectable({
  providedIn: 'root'
})
export class ValidatorService {
  private readonly cosmoStationBaseUrl = 'https://api.cosmostation.io/v1/'
  constructor(private readonly http: HttpClient) {}

  public async getValidatorInfos(operator_address: string): Promise<ValidatorInfos> {
    const statusCodes = { 0: 'jailed', 1: 'inactive', 2: 'active' }
    return new Promise(resolve => {
      this.http
        .get<CosmosValidatorObject>(`${this.cosmoStationBaseUrl}/staking/validator/${operator_address}`)
        .subscribe((validator: CosmosValidatorObject) => {
          if (validator) {
            resolve({
              rate: `${(parseFloat(validator.rate) * 100).toString()}%`,
              status: statusCodes[validator.status],
              totalDelegationBalance: `${(parseFloat(validator.tokens) / 1000).toString()}` // TODO display in a nice format
            })
          } else {
            resolve({
              rate: 'unknown',
              status: 'unknown',
              totalDelegationBalance: 'unknown'
            })
          }
        })
    })
  }
}
