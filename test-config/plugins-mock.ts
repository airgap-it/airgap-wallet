import { newSpy } from './unit-test-helper'

export class AppMock {
  public addListener = newSpy('addListener', {})
  public openUrl = newSpy('openUrl', Promise.resolve())
}

export class AppInfoMock {
  public get: jasmine.Spy = newSpy(
    'set',
    Promise.resolve({
      appName: 'AirGap.UnitTest',
      packageName: 'AirGap',
      versionName: '0.0.0',
      versionCode: 0
    })
  )
}

export class ClipboardMock {
  public read: jasmine.Spy = newSpy('read', Promise.resolve())
  public write: jasmine.Spy = newSpy('write', Promise.resolve())
}

export class PermissionsMock {
  public query: jasmine.Spy = newSpy('query', Promise.resolve())
}

export class PushNotificationsMock {
  public register: jasmine.Spy = newSpy('register', Promise.resolve())
  public addListener: jasmine.Spy = newSpy('addListener', {})
}

export class SplashScreenMock {
  public hide: jasmine.Spy = newSpy('hide', Promise.resolve())
}

export class StatusBarMock {
  public setStyle: jasmine.Spy = newSpy('setStyle', Promise.resolve())
  public setBackgroundColor: jasmine.Spy = newSpy('setBackgroundColor', Promise.resolve())
}
