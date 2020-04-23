import { newSpy } from './unit-test-helper'

export class AppMock {
  public addListener = newSpy('addListener', {})
  public openUrl = newSpy('openUrl', Promise.resolve())
}

export class SplashScreenMock {
  public hide: jasmine.Spy = newSpy('hide', Promise.resolve())
}

export class StatusBarMock {
  public setStyle: jasmine.Spy = newSpy('setStyle', Promise.resolve())
  public setBackgroundColor: jasmine.Spy = newSpy('setBackgroundColor', Promise.resolve())
}
