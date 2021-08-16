import { ProtocolSymbols } from '@airgap/coinlib-core'
import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import BigNumber from 'bignumber.js'

import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

const COIN_LIB_SERVICE = 'https://coin-lib-service.airgap.prod.gke.papers.tech'

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

export interface ApiHealth {
  identifier: ProtocolSymbols
  node: {
    isHealthy: boolean
    errorDescription?: string
  }
  explorer?: {
    isHealthy: boolean
    errorDescription?: string
  }
}

export interface TezosBakerCollection {
  [address: string]: TezosBakerDetails
}
export interface TezosBakerDetails {
  alias: string
  logo?: string
  hasLogo: boolean
  hasPayoutAddress?: boolean
  logoReference?: string
  stakingCapacity?: BigNumber
  payoutPeriod?: number
  payoutDelay?: number
  fee?: BigNumber
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
export class CoinlibService {
  constructor(private readonly httpClient: HttpClient) {}

  public async getKnownTezosBakers(): Promise<TezosBakerCollection> {
    const bakersResponse: TezosBakerCollection = await this.httpClient
      .get<TezosBakerCollection>(`${COIN_LIB_SERVICE}/api/v1/tz/bakers?acceptsDelegations=true`)
      .toPromise()
      .catch((error) => {
        handleErrorSentry(ErrorCategory.OTHER)(error)

        return {}
      })

    Object.entries(bakersResponse).forEach(([address, baker]: [string, TezosBakerDetails]) => {
      bakersResponse[address] = {
        ...baker,
        stakingCapacity: baker.stakingCapacity !== undefined ? new BigNumber(baker.stakingCapacity) : undefined,
        fee: baker.fee !== undefined ? new BigNumber(baker.fee) : undefined,
        logo: baker.hasLogo ? `${COIN_LIB_SERVICE}/api/v1/tz/bakers/image/${baker.logoReference || address}` : undefined
      }
    })

    return bakersResponse
  }

  public async getKnownCosmosValidators(): Promise<CosmosValidatorDetails[]> {
    const validatorsResponse: CosmosValidatorDetails[] = await this.httpClient
      .get<CosmosValidatorDetails[]>(`${COIN_LIB_SERVICE}/api/v1/cosmos/validators`)
      .toPromise()
      .catch((error) => {
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
          logo: `${COIN_LIB_SERVICE}/api/v1/cosmos/validators/image/${validator.operator_address}`
        }
      })
    )
  }

  public async checkApiHealth(): Promise<ApiHealth[]> {
    const apiHealth: ApiHealth[] = await this.httpClient
      .get<ApiHealth[]>(`${COIN_LIB_SERVICE}/api/v1/health`)
      .toPromise()
      .catch((error) => {
        handleErrorSentry(ErrorCategory.OTHER)(error)
        return []
      })
    return apiHealth
  }
}
