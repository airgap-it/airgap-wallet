import {
  ContractCannotAssessCompatibilityWarning,
  ContractInvalidError,
  ContractNotCompatibleWarning,
  InjectorInvalidError,
  TezosSaplingContractFormError,
  TezosSaplingContractFormErrorType,
  TezosSaplingContractFormWarning,
  TezosSaplingContractFormWarningType,
  UnknownError
} from './tezos-sapling-contract-form.types'

export function contractNotCompatibleWarning(contractAddress: string): ContractNotCompatibleWarning {
  return { type: TezosSaplingContractFormWarningType.CONTRACT_NOT_COMPATIBLE, contractAddress }
}

export function contractCannotAssessCompatibilityWarning(contractAddress: string): ContractCannotAssessCompatibilityWarning {
  return { type: TezosSaplingContractFormWarningType.CONTRACT_CANNOT_ASSESS_COMPATIBILITY, contractAddress }
}

export function isTezosSaplingContractFormWarning(warning: unknown): warning is TezosSaplingContractFormWarning {
  return typeof warning === 'object' && Object.values(TezosSaplingContractFormWarningType).includes(warning['type'])
}

export function contractInvalidError(): ContractInvalidError {
  return { type: TezosSaplingContractFormErrorType.CONTRACT_INVALID }
}

export function injectorInvalidError(): InjectorInvalidError {
  return { type: TezosSaplingContractFormErrorType.INJECTOR_INVALID }
}

export function unknownError(error?: any): UnknownError {
  return { type: TezosSaplingContractFormErrorType.UNKNOWN, error }
}

export function isTezosSaplingContractFormError(error: unknown): error is TezosSaplingContractFormError {
  return typeof error === 'object' && Object.values(TezosSaplingContractFormErrorType).includes(error['type'])
}
