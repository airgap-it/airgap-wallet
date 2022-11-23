import { UIResource } from '@airgap/angular-core'
import { ICoinProtocol, MainProtocolSymbols } from '@airgap/coinlib-core'

export interface TezosSaplingContractFormState {
  protocol: UIResource<ICoinProtocol>

  currentContractAddress: UIResource<string | undefined>
  newContractAddress: UIResource<string>

  includeInjector: boolean
  currentInjectorUrl: UIResource<string | undefined>
  newInjectorUrl: UIResource<string | undefined>

  warningDescription: string | undefined
  errorDescription: string | undefined
}

export interface TezosSaplingContractParameters {
  protocolIdentifier: MainProtocolSymbols
  networkIdentifier: string
}

interface TezosSaplingContractFormTypedBase<T> {
  type: T
}

// warning

export enum TezosSaplingContractFormWarningType {
  CONTRACT_NOT_COMPATIBLE = 'contract-not-compatible',
  CONTRACT_CANNOT_ASSESS_COMPATIBILITY = 'contract-cannot-assess-compatibility'
}

export interface ContractNotCompatibleWarning
  extends TezosSaplingContractFormTypedBase<TezosSaplingContractFormWarningType.CONTRACT_NOT_COMPATIBLE> {
  contractAddress: string
}

export interface ContractCannotAssessCompatibilityWarning
  extends TezosSaplingContractFormTypedBase<TezosSaplingContractFormWarningType.CONTRACT_CANNOT_ASSESS_COMPATIBILITY> {
  contractAddress: string
}

export type TezosSaplingContractFormWarning = ContractNotCompatibleWarning | ContractCannotAssessCompatibilityWarning

// error

export enum TezosSaplingContractFormErrorType {
  CONTRACT_INVALID = 'contract-invalid',
  INJECTOR_INVALID = 'injector-invalid',
  UNKNOWN = 'unknown'
}

export interface ContractInvalidError extends TezosSaplingContractFormTypedBase<TezosSaplingContractFormErrorType.CONTRACT_INVALID> {}
export interface InjectorInvalidError extends TezosSaplingContractFormTypedBase<TezosSaplingContractFormErrorType.INJECTOR_INVALID> {}
export interface UnknownError extends TezosSaplingContractFormTypedBase<TezosSaplingContractFormErrorType.UNKNOWN> {
  error?: any
}

export type TezosSaplingContractFormError = ContractInvalidError | InjectorInvalidError | UnknownError
