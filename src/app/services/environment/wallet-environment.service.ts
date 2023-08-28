import { BaseEnvironmentService, RuntimeMode } from '@airgap/angular-core'
import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class WalletEnvironmentService extends BaseEnvironmentService {
  public constructor() {
    super(RuntimeMode.ONLINE)
  }
}
