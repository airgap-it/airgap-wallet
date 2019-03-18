import { Injectable } from '@angular/core'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'
import { HttpClient } from '@angular/common/http'
import BigNumber from 'bignumber.js'

const CONFIG_BACKEND = 'https://config.airgap.prod.gke.papers.tech/'

export interface BakerConfig {
  name: string
  address: string
  fee: BigNumber
  enabled: boolean
}

@Injectable()
export class RemoteConfigProvider {
  constructor(private readonly httpClient: HttpClient) {}

  async tezosBakers(): Promise<BakerConfig[]> {
    const responsePromise = this.httpClient.get<BakerConfig[]>(`${CONFIG_BACKEND}config/xtz/bakers`).toPromise()
    responsePromise.catch(handleErrorSentry(ErrorCategory.OTHER))
    const response = await responsePromise
    return response.map(config => {
      return {
        name: config.name,
        address: config.address,
        fee: new BigNumber(config.fee),
        enabled: config.enabled
      }
    })
  }
}
