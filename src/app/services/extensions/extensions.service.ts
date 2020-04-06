import { Injectable } from '@angular/core'
import { ICoinDelegateProtocol, PolkadotProtocol } from 'airgap-coin-lib'
import { ProtocolDelegationExtensions } from 'src/app/extensions/delegation/ProtocolDelegationExtensions'
import { PolkadotDelegationExtensions } from 'src/app/extensions/delegation/PolkadotDelegationExtensions'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { DecimalPipe } from '@angular/common'
import { FormBuilder } from '@angular/forms'

@Injectable({
  providedIn: 'root'
})
export class ExtensionsService {
  private extensions: [new () => ICoinDelegateProtocol, () => ProtocolDelegationExtensions<any>][] = [
    [PolkadotProtocol, () => PolkadotDelegationExtensions.create(this.formBuilder, this.decimalPipe, this.amountConverterPipe)]
  ]

  public constructor(
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe
  ) {}

  public async loadDelegationExtensions(): Promise<void> {
    for (let [protocol, extensionFactory] of this.extensions) {
      ProtocolDelegationExtensions.load(protocol, extensionFactory())
    }
  }
}
