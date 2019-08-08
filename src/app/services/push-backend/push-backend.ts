import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'

const TRANSACTION_BACKEND_URL: string = 'https://tx.airgap.prod.gke.papers.tech/'

export interface PushAddressRequest {
  address: string
  identifier: string
  pushToken: string
  languageCode: string
}

@Injectable({
  providedIn: 'root'
})
export class PushBackendProvider {
  constructor(private readonly http: HttpClient) {}

  public async registerPushMany(pushRequests: PushAddressRequest[]): Promise<string> {
    return this.http
      .post(`${TRANSACTION_BACKEND_URL}api/v1/push_notifications/register/`, pushRequests, { responseType: 'text' })
      .toPromise()
  }

  public async unregisterPush(protocolIdentifier: string, address: string, pushToken: string): Promise<string> {
    const body: object = {
      address,
      identifier: protocolIdentifier,
      pushToken
    }

    return this.http.post(`${TRANSACTION_BACKEND_URL}api/v1/push_notifications/unregister/`, body, { responseType: 'text' }).toPromise()
  }

  public async getPendingTxs(address: string, protocolIdentifier: string): Promise<object> {
    return this.http
      .get(`${TRANSACTION_BACKEND_URL}api/v1/txs/pending?address=${address}&protocolIdentifier=${protocolIdentifier}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      .toPromise()
  }

  public async postPendingTx(transaction: object): Promise<string> {
    return this.http.post(`${TRANSACTION_BACKEND_URL}api/v1/txs/pending`, transaction, { responseType: 'text' }).toPromise()
  }
}
