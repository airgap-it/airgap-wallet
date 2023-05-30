import { UIResource } from '@airgap/angular-core'
import { ICoinProtocol } from '@airgap/coinlib-core'
import { OptimismProtocolNetwork } from '@airgap/optimism'

export interface TokenDetailsInput { 
  address: string
  networkIdentifier: string
}

export interface OptimismERC20FormState {
  networks: OptimismProtocolNetwork[]
  protocol: UIResource<ICoinProtocol>
  
  errorDescription: string | undefined
}

// error

export enum OptimismERC20FormErrorType {
  CONTRACT_NOT_FOUND = 'contract-not-found',
  TOKEN_METADATA_MISSING = 'token-metadata-missing',
  UNKNOWN = 'unknown'
}

interface OptimismERC20FormBaseError<T extends OptimismERC20FormErrorType> {
  type: T
}

export interface ContractNotFoundError extends OptimismERC20FormBaseError<OptimismERC20FormErrorType.CONTRACT_NOT_FOUND> {}
export interface TokenMetadataMissingError extends OptimismERC20FormBaseError<OptimismERC20FormErrorType.TOKEN_METADATA_MISSING> {}
export interface UnknownError extends OptimismERC20FormBaseError<OptimismERC20FormErrorType.UNKNOWN> {
  error?: any
}

export type OptimismERC20FormError = 
  | ContractNotFoundError 
  | TokenMetadataMissingError 
  | UnknownError
