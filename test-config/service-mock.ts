import { newSpy } from './unit-test-helper'
import { PermissionStatus } from 'src/app/services/permissions/permissions'

export class PermissionsProviderMock {
  public hasCameraPermission = newSpy('hasCameraPermission', Promise.resolve(PermissionStatus.GRANTED))
  public hasNotificationsPermission = newSpy('hasNotificationsPermission', Promise.resolve(PermissionStatus.GRANTED))
}
