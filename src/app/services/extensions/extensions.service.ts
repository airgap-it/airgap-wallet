import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class ExtensionsService {
  public async loadDelegationExtensions(): Promise<void> {
    await import('../../extensions/delegation')
  }
}
