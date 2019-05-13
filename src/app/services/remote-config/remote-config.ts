import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import BigNumber from 'bignumber.js'

import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

const CONFIG_BACKEND = 'https://config.airgap.prod.gke.papers.tech/'

export interface BakerConfig {
  name: string
  address: string
  fee: BigNumber
  enabled: boolean
  payout: {
    cycles: number
    time: string
  }
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

  public async tezosBakers(): Promise<BakerConfig[]> {
    const responsePromise = this.httpClient.get<BakerConfig[]>(`${CONFIG_BACKEND}config/xtz/bakers`).toPromise()
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
}
