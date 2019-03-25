import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'

const transactionBackendUrl = 'https://tx.airgap.prod.gke.papers.tech/'

export interface PushAddressRequest {
  address: string
  identifier: string
  pushToken: string
  languageCode: string
}

@Injectable()
export class PushBackendProvider {
  constructor(private http: HttpClient) {}

  async registerPushMany(pushRequests: PushAddressRequest[]) {
    console.log(`PushService: Registering ${pushRequests.length} wallets`)

    return this.http.post(`${transactionBackendUrl}api/v1/push_notifications/register/`, pushRequests, { responseType: 'text' }).toPromise()
  }

  async unregisterPush(protocolIdentifier: string, address: string, pushToken: string) {
    console.log(`PushService: Unregistering wallet ${protocolIdentifier}-${address}`)
    const body = {
      address: address,
      identifier: protocolIdentifier,
      pushToken: pushToken
    }

    return this.http.post(`${transactionBackendUrl}api/v1/push_notifications/unregister/`, body, { responseType: 'text' }).toPromise()
  }
}
