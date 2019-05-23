import { browser, by, element } from 'protractor'

import { PageObjectBase } from './base.po'

export class AppPage extends PageObjectBase {
  public navigateTo() {
    return browser.get('/')
  }

  public waitForAngular() {
    return browser.waitForAngular()
  }

  public getParagraphText() {
    return element(by.deepCss('app-root ion-content')).getText()
  }
}
