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
  private readonly cosmoStationUrl = 'https://api.cosmostation.io/v1/staking/validators'
  constructor(private readonly http: HttpClient) {}

  public async getValidatorInfos(validatorName: string): Promise<ValidatorInfos> {
    const statusCodes = { 0: 'jailed', 1: 'inactive', 2: 'active' }
    return new Promise(resolve => {
      this.http.get<Array<CosmosValidatorObject>>(this.cosmoStationUrl).subscribe((response: Array<CosmosValidatorObject>) => {
        const validator = response.find((validator: CosmosValidatorObject) => validator.operator_address === validatorName)
        if (validator) {
          resolve({ rate: `${(parseFloat(validator.rate) * 100).toString()}%`, status: statusCodes[validator.status] })
        }
      })
    })
  }
}
