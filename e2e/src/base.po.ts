import * as fs from 'fs'
import { browser, by, element, ExpectedConditions } from 'protractor'

import { slugify } from './utils'

export class PageObjectBase {
  private time: Date
  private path: string
  protected tag: string

  constructor(tag: string, path: string, time: Date = new Date()) {
    this.tag = tag
    this.path = path
    this.time = time
  }

  load() {
    return browser.get(this.path)
  }

  rootElement() {
    return element(by.css(this.tag))
  }

  waitUntilInvisible() {
    browser.wait(ExpectedConditions.invisibilityOf(this.rootElement()), 3000)
  }

  waitUntilPresent() {
    browser.wait(ExpectedConditions.presenceOf(this.rootElement()), 3000)
  }

  waitUntilNotPresent() {
    browser.wait(ExpectedConditions.not(ExpectedConditions.presenceOf(this.rootElement())), 3000)
  }

  waitUntilVisible() {
    browser.wait(ExpectedConditions.visibilityOf(this.rootElement()), 3000)
  }

  waitForAngular() {
    return browser.waitForAngular()
  }

  sleep(time: number) {
    return browser.sleep(time)
  }

  getTitle() {
    return element(by.css(`${this.tag} ion-title`)).getText()
  }

  protected enterInputText(sel: string, text: string) {
    const el = element(by.css(`${this.tag} ${sel}`))
    const inp = el.element(by.css('input'))
    inp.sendKeys(text)
  }

  protected enterTextareaText(sel: string, text: string) {
    const el = element(by.css(`${this.tag} ${sel}`))
    const inp = el.element(by.css('textarea'))
    inp.sendKeys(text)
  }

  protected clickButton(sel: string) {
    const el = element(by.css(`${this.tag} ${sel}`))
    browser.wait(ExpectedConditions.elementToBeClickable(el))
    el.click()
  }

  async takeScreenshot(name: string) {
    await browser.imageComparison.checkScreen(name)

    return browser
      .takeScreenshot()
      .then(async png => {
        const config = await browser.getProcessedConfig()

        const platform = config.capabilities.chromeOptions.mobileEmulation
          ? slugify(config.capabilities.chromeOptions.mobileEmulation.deviceName)
          : 'desktop'

        console.log(platform, 'screenshot', name)

        const stream = fs.createWriteStream(
          `./screenshots/${platform}/${this.tag}-${this.time.getTime()}-${name}.png` /* node >10 { recursive: true }*/
        )
        stream.write(Buffer.from(png, 'base64'))
        stream.end()
      })
      .catch(error => console.error('Cannot take screenshot', error))
  }
}
