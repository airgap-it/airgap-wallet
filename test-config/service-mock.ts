import { PermissionStatus } from '@airgap/angular-core'

import { newSpy } from './unit-test-helper'

export class PermissionsServiceMock {
  public hasCameraPermission = newSpy('hasCameraPermission', Promise.resolve(PermissionStatus.GRANTED))
}

export class PushBackendProviderMock {
  public registerPushMany = newSpy('registerPushMany', Promise.resolve(''))
  public unregisterPush = newSpy('unregisterPush', Promise.resolve(''))
  public getPendingTxs = newSpy('getPendingTxs', Promise.resolve([] /* : AirGapTransaction[] */))
  public postPendingTx = newSpy('postPendingTx', Promise.resolve(''))
}