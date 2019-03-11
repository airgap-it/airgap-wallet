import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'

@Injectable()
export class PushBackendProvider {
  constructor() {}

  async registerPush(protocolIdentifier: string, address: string, pushToken: string, languageCode: string = 'de-CH') {
    const body = {
      address: address,
      identifier: protocolIdentifier,
      pushToken: pushToken,
      languageCode: languageCode
    }

    return // post to backend
  }
}
