import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import BigNumber from 'bignumber.js'

import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

const COIN_LIB_SERVICE = 'https://coin-lib-service.airgap.prod.gke.papers.tech/api/v1'

export interface TezosBakerConfig {
  name: string
  address: string
  fee: BigNumber
  enabled: boolean
  payout: {
    cycles: number
    time: string
  }
}
export interface TezosBakerDetails {
  alias: string
  address: string
  logo?: string
  hasLogo: boolean
  hasPayoutAddress?: boolean
  logoReference?: string
  stakingCapacity?: BigNumber
  payoutDelay?: number
  fee?: BigNumber
}

interface TezosBakerDetailsResponse {
  [address: string]: Omit<TezosBakerDetails, 'address'>
}

export interface CosmosValidatorDetails {
  operator_address: string
  consensus_pubkey: string
  jailed: false
  status: number
  tokens: BigNumber
  delegator_shares: BigNumber
  description: {
    moniker: string
    identity: string
    website: string
    details: string
  }
  unbonding_height: string
  unbonding_time: string
  commission: {
    commission_rates: {
      rate: BigNumber
      max_rate: BigNumber
      max_change_rate: BigNumber
    }
    update_time: string
  }
  min_self_delegation: string
  logo?: string
}

export interface AeFirstVote {
  enabled: boolean
  showSelfVoted: boolean
  startDate: number
  endDate: number
}

@Injectable({
  providedIn: 'root'
})
export class RemoteConfigProvider {
  constructor(private readonly httpClient: HttpClient) {}

  public async getKnownTezosBakers(): Promise<TezosBakerDetails[]> {
    const bakersResponse: TezosBakerDetailsResponse = await this.httpClient
      .get<TezosBakerDetailsResponse>(`${COIN_LIB_SERVICE}/tz/bakers`)
      .toPromise()
      .catch(error => {
        handleErrorSentry(ErrorCategory.OTHER)(error)

        return {}
      })

    return Object.entries(bakersResponse).map(([address, baker]: [string, Omit<TezosBakerDetails, 'address'>]) => {
      return {
        address,
        ...baker,
        stakingCapacity: baker.stakingCapacity !== undefined ? new BigNumber(baker.stakingCapacity) : undefined,
        fee: baker.fee !== undefined ? new BigNumber(baker.fee) : undefined,
        logo: baker.hasLogo ? `${COIN_LIB_SERVICE}/tz/bakers/image/${baker.logoReference || address}` : undefined
      }
    })
  }

  public async getKnownCosmosValidators(): Promise<CosmosValidatorDetails[]> {
    const validatorsResponse: CosmosValidatorDetails[] = await this.httpClient
      .get<CosmosValidatorDetails[]>(`${COIN_LIB_SERVICE}/cosmos/validators`)
      .toPromise()
      .catch(error => {
        handleErrorSentry(ErrorCategory.OTHER)(error)

        return []
      })

    return Promise.all(
      validatorsResponse.map(async (validator: CosmosValidatorDetails) => {
        return {
          ...validator,
          tokens: new BigNumber(validator.tokens),
          delegator_shares: new BigNumber(validator.delegator_shares),
          commission: {
            ...validator.commission,
            commission_rates: {
              rate: new BigNumber(validator.commission.commission_rates.rate),
              max_rate: new BigNumber(validator.commission.commission_rates.max_rate),
              max_change_rate: new BigNumber(validator.commission.commission_rates.max_change_rate)
            }
          },
          logo: `${COIN_LIB_SERVICE}/cosmos/validators/image/${validator.operator_address}`
        }
      })
    )
  }
}
