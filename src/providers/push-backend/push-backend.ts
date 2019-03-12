import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'

const transactionBackendUrl = 'http://tx.airgap.gke.papers.tech/'

@Injectable()
export class PushBackendProvider {
  constructor(private http: HttpClient) {}

  async registerPush(protocolIdentifier: string, address: string, pushToken: string, languageCode: string = 'en') {
    console.log(`Registered to push service for wallet ${protocolIdentifier} ${address}`)
    const body = {
      address: address,
      identifier: protocolIdentifier,
      pushToken: pushToken,
      languageCode: languageCode
    }

    return this.http.post<any>(`${transactionBackendUrl}api/v1/push_notifications/register/`, body).toPromise()
  }
}
