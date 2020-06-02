import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import BigNumber from 'bignumber.js'

import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

const CONFIG_BACKEND = 'https://config.airgap.prod.gke.papers.tech/'
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
  logo?: Blob
  hasLogo: boolean
  hasPayoutAddress?: boolean
  logoReference?: string
  accountType?: 'address' | 'contract'
}

type TezosBakerDetailsResponse = { [address: string]: Omit<TezosBakerDetails, 'address'> }

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

  public async tezosBakers(): Promise<TezosBakerConfig[]> {
    const responsePromise = this.httpClient.get<TezosBakerConfig[]>(`${CONFIG_BACKEND}config/xtz/bakers`).toPromise()
    responsePromise.catch(handleErrorSentry(ErrorCategory.OTHER))
    const response = await responsePromise

    return response.map(config => {
      return {
        name: config.name,
        address: config.address,
        fee: new BigNumber(config.fee),
        enabled: config.enabled,
        payout: {
          cycles: config.payout.cycles,
          time: config.payout.time
        }
      }
    })
  }

  public async getKnownTezosBakers(): Promise<TezosBakerDetails[]> {
    const headers: Record<string, string | string[]> = { Authorization: '00j5uz-l202uq251-ite2x6bl-gckpbr9' }
    const bakersResponse: TezosBakerDetailsResponse = await this.httpClient
      .get<TezosBakerDetailsResponse>(`${COIN_LIB_SERVICE}/tz/bakers`, { headers })
      .toPromise()
      .catch(error => {
        handleErrorSentry(ErrorCategory.OTHER)(error)

        return {}
      })

    const logos: [string, Blob | undefined][] = await Promise.all(
      Object.entries(bakersResponse)
        .filter(([_, baker]: [string, Omit<TezosBakerDetails, 'address'>]) => baker.hasLogo)
        .map(([address, baker]: [string, Omit<TezosBakerDetails, 'address'>]) => {
          return this.httpClient
            .get(`${COIN_LIB_SERVICE}/tz/bakers/image/${baker.logoReference || address}`, { headers, responseType: 'blob' })
            .toPromise()
            .then((logo: Blob) => [address, logo] as [string, Blob])
            .catch(error => {
              handleErrorSentry(ErrorCategory.OTHER)(error)

              return [address, undefined] as [string, undefined]
            })
        })
    )

    logos.forEach(([address, logo]: [string, Blob | undefined]) => {
      bakersResponse[address].logo = logo
    })

    return Object.entries(bakersResponse).map(([address, baker]: [string, Omit<TezosBakerDetails, 'address'>]) => {
      return {
        address,
        ...baker
      }
    })
  }

  public async getKnownCosmosValidators(): Promise<CosmosValidatorDetails[]> {
    const headers: Record<string, string> = { Authorization: '00j5uz-l202uq251-ite2x6bl-gckpbr9' }
    const promise: Promise<CosmosValidatorDetails[]> = this.httpClient
      .get<CosmosValidatorDetails[]>(`${COIN_LIB_SERVICE}/cosmos/validators`, { headers })
      .toPromise()

    promise.catch(handleErrorSentry(ErrorCategory.OTHER))
    const response: CosmosValidatorDetails[] = await promise

    return response.map((details: CosmosValidatorDetails) => {
      return {
        ...details,
        tokens: new BigNumber(details.tokens),
        delegator_shares: new BigNumber(details.delegator_shares),
        commission: {
          ...details.commission,
          commission_rates: {
            rate: new BigNumber(details.commission.commission_rates.rate),
            max_rate: new BigNumber(details.commission.commission_rates.max_rate),
            max_change_rate: new BigNumber(details.commission.commission_rates.max_change_rate)
          }
        }
      }
    })
  }
}
