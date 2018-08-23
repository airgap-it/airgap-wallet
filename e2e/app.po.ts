import { browser } from 'protractor'

export class Page {

  navigateTo(destination: string) {
    return browser.get(destination)
  }

  getTitle() {
    return browser.getTitle()
  }

}
