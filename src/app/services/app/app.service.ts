import { ExposedPromise } from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class AppService {
  private readonly isReady: ExposedPromise<void> = new ExposedPromise()

  public setReady() {
    this.isReady.resolve()
  }

  public async waitReady(): Promise<void> {
    return this.isReady.promise
  }
}
