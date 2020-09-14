import { PermissionStatus } from '@airgap/angular-core'

import { newSpy } from './unit-test-helper'

export class PermissionsServiceMock {
  public hasCameraPermission = newSpy('hasCameraPermission', Promise.resolve(PermissionStatus.GRANTED))
}
