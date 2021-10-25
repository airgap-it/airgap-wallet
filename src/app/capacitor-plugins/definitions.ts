import { registerPlugin } from '@capacitor/core'

export interface SaplingNativePlugin {
  isSupported(): Promise<{ isSupported: boolean }>
  initParameters(): Promise<void>
  initProvingContext(): Promise<{ context: string }>
  dropProvingContext(params: { context: string }): Promise<void>
  prepareSpendDescription(params: {
    context: string
    spendingKey: string
    address: string
    rcm: string
    ar: string
    value: string
    root: string
    merklePath: string
  }): Promise<{ spendDescription: string }>
  preparePartialOutputDescription(params: {
    context: string
    address: string
    rcm: string
    esk: string
    value: string
  }): Promise<{ outputDescription: string }>
  createBindingSignature(params: { context: string; balance: string; sighash: string }): Promise<{ bindingSignature: string }>
}

export const SaplingNative: SaplingNativePlugin = registerPlugin('SaplingNative')