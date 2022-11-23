import { ProtocolService, UIResourceStatus } from '@airgap/angular-core'
import { TezosSaplingProtocol } from '@airgap/tezos'
import { Injectable } from '@angular/core'
import { ComponentStore, tapResponse } from '@ngrx/component-store'
import { from, Observable, of } from 'rxjs'
import { repeat, switchMap, withLatestFrom } from 'rxjs/operators'

import {
  TezosSaplingContractFormErrorType,
  TezosSaplingContractFormState,
  TezosSaplingContractFormWarningType,
  TezosSaplingContractParameters
} from './tezos-sapling-contract-form.types'
import {
  contractCannotAssessCompatibilityWarning,
  contractInvalidError,
  contractNotCompatibleWarning,
  injectorInvalidError,
  isTezosSaplingContractFormError,
  isTezosSaplingContractFormWarning,
  unknownError
} from './tezos-sapling-contract-form.utils'

const initialState: TezosSaplingContractFormState = {
  protocol: { status: UIResourceStatus.IDLE, value: undefined },

  currentContractAddress: { status: UIResourceStatus.IDLE, value: undefined },
  newContractAddress: { status: UIResourceStatus.IDLE, value: undefined },

  includeInjector: false,
  currentInjectorUrl: { status: UIResourceStatus.IDLE, value: undefined },
  newInjectorUrl: { status: UIResourceStatus.IDLE, value: undefined },

  warningDescription: undefined,
  errorDescription: undefined
}

@Injectable()
export class TezosSaplingContractFormStore extends ComponentStore<TezosSaplingContractFormState> {
  constructor(private readonly protocolService: ProtocolService) {
    super(initialState)
  }

  public readonly onChange$ = this.effect((parameters$: Observable<TezosSaplingContractParameters>) => {
    return parameters$.pipe(
      switchMap((parameters) => {
        return from(this.onParametersChanged(parameters)).pipe(
          tapResponse(
            (partialState) => this.updateWithValue(partialState),
            (error) => this.updateWithErrorOrWarning(error)
          )
        )
      })
    )
  })

  public readonly onContractAddressInput$ = this.effect((address$: Observable<string>) => {
    return address$.pipe(
      withLatestFrom(this.state$),
      switchMap(([address, state]) => {
        return from(this.validateContractAddress(state, address)).pipe(
          tapResponse(
            (partialState) => this.updateWithValue(partialState),
            (error) => this.updateWithErrorOrWarning(error)
          )
        )
      }),
      repeat()
    )
  })

  public readonly onInjectorUrlInput$ = this.effect((url$: Observable<string>) => {
    return url$.pipe(
      withLatestFrom(this.state$),
      switchMap(([url, state]) => {
        return from(this.validateInjectorUrl(state, url)).pipe(
          tapResponse(
            (partialState) => this.updateWithValue(partialState),
            (error) => this.updateWithErrorOrWarning(error)
          )
        )
      }),
      repeat()
    )
  })

  public readonly onIncludeInjectorToggled$ = this.effect((includeInjector$: Observable<boolean>) => {
    return includeInjector$.pipe(
      switchMap((includeInjector) => {
        return of({ includeInjector }).pipe(
          tapResponse(
            (partialState) => this.updateWithValue(partialState),
            (error) => this.updateWithErrorOrWarning(error)
          )
        )
      }),
      repeat()
    )
  })

  public selectFromState<K extends keyof TezosSaplingContractFormState>(key: K): Observable<TezosSaplingContractFormState[K]> {
    return this.select((state) => state[key])
  }

  private updateWithValue = this.updater((state: TezosSaplingContractFormState, partialState: Partial<TezosSaplingContractFormState>) => {
    return {
      ...state,
      ...partialState,
      warningDescription: undefined,
      errorDescription: undefined
    }
  })

  private updateWithErrorOrWarning = this.updater((state: TezosSaplingContractFormState, errorOrWarning: unknown) => {
    const warning = isTezosSaplingContractFormWarning(errorOrWarning) ? errorOrWarning : undefined
    const error =
      warning === undefined ? (isTezosSaplingContractFormError(errorOrWarning) ? errorOrWarning : unknownError(errorOrWarning)) : undefined

    if (error && error.type === TezosSaplingContractFormErrorType.UNKNOWN && error.error) {
      console.error(errorOrWarning)
    }

    return {
      ...state,
      newContractAddress:
        error?.type === TezosSaplingContractFormErrorType.CONTRACT_INVALID
          ? { status: UIResourceStatus.ERROR, value: undefined }
          : warning?.type === TezosSaplingContractFormWarningType.CONTRACT_NOT_COMPATIBLE ||
            warning?.type === TezosSaplingContractFormWarningType.CONTRACT_CANNOT_ASSESS_COMPATIBILITY
          ? { status: UIResourceStatus.SUCCESS, value: warning.contractAddress }
          : state.newContractAddress,
      newInjectorUrl:
        error?.type === TezosSaplingContractFormErrorType.INJECTOR_INVALID
          ? { status: UIResourceStatus.ERROR, value: undefined }
          : state.newInjectorUrl,
      warningDescription: warning ? `tezos-sapling-contract-form.warning.${warning.type}` : undefined,
      errorDescription: error ? `tezos-sapling-contract-form.error.${error.type}` : undefined
    }
  })

  private async onParametersChanged(parameters: TezosSaplingContractParameters): Promise<Partial<TezosSaplingContractFormState>> {
    const protocol = (await this.protocolService.getProtocol(
      parameters.protocolIdentifier,
      parameters.networkIdentifier
    )) as TezosSaplingProtocol
    const protocolOptions = await protocol.getOptions()

    return {
      protocol: { status: UIResourceStatus.SUCCESS, value: protocol },
      currentContractAddress: { status: UIResourceStatus.SUCCESS, value: protocolOptions.config.contractAddress },
      currentInjectorUrl: { status: UIResourceStatus.SUCCESS, value: protocolOptions.config.injectorUrl },
      warningDescription: undefined,
      errorDescription: undefined
    }
  }

  private async validateContractAddress(
    state: TezosSaplingContractFormState,
    address: string
  ): Promise<Partial<TezosSaplingContractFormState>> {
    if (!address.startsWith('KT1')) {
      throw contractInvalidError()
    }

    const protocol = state.protocol
    try {
      if (protocol.status === UIResourceStatus.SUCCESS) {
        const saplingProtocol = protocol.value as TezosSaplingProtocol
        const isContractValid = await saplingProtocol.isContractValid(address)

        if (!isContractValid) {
          throw contractNotCompatibleWarning(address)
        }

        return {
          newContractAddress: { status: UIResourceStatus.SUCCESS, value: address }
        }
      }
    } catch {}

    throw contractCannotAssessCompatibilityWarning(address)
  }

  private async validateInjectorUrl(
    state: TezosSaplingContractFormState,
    injectorUrl: string | undefined
  ): Promise<Partial<TezosSaplingContractFormState>> {
    if (state.includeInjector && (injectorUrl === undefined || injectorUrl.match(/^http[s]?:\/\/.+/) === null)) {
      throw injectorInvalidError()
    }

    return {
      newInjectorUrl: { status: UIResourceStatus.SUCCESS, value: injectorUrl }
    }
  }
}
