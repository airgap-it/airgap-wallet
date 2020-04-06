import { Injectable } from '@angular/core'
import { ICoinDelegateProtocol, PolkadotProtocol, TezosProtocol } from 'airgap-coin-lib'
import { ProtocolDelegationExtensions } from 'src/app/extensions/delegation/ProtocolDelegationExtensions'
import { PolkadotDelegationExtensions } from 'src/app/extensions/delegation/PolkadotDelegationExtensions'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { DecimalPipe } from '@angular/common'
import { FormBuilder } from '@angular/forms'
import { RemoteConfigProvider } from '../remote-config/remote-config'
import { TezosDelegationExtensions } from 'src/app/extensions/delegation/TezosDelegationExtensions'

@Injectable({
  providedIn: 'root'
})
export class ExtensionsService {
  private extensions: [new () => ICoinDelegateProtocol, () => Promise<ProtocolDelegationExtensions<any>>][] = [
    [PolkadotProtocol, async () => PolkadotDelegationExtensions.create(this.formBuilder, this.decimalPipe, this.amountConverterPipe)],
    [TezosProtocol, () => TezosDelegationExtensions.create(this.remoteConfigProvider, this.decimalPipe, this.amountConverterPipe)]
  ]

  public constructor(
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly remoteConfigProvider: RemoteConfigProvider
  ) {}

  public async loadDelegationExtensions(): Promise<void> {
    const extensions = await Promise.all(
      this.extensions.map(
        async ([protocol, extensionFactory]) =>
          [protocol, await extensionFactory()] as [new () => ICoinDelegateProtocol, ProtocolDelegationExtensions<any>]
      )
    )

    for (let [protocol, extension] of extensions) {
      ProtocolDelegationExtensions.load(protocol, extension)
    }
  }
}
