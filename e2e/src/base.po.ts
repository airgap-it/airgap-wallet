import { browser, by, element, ExpectedConditions } from 'protractor'
import { slugify } from './utils'
import * as fs from 'fs'

export class PageObjectBase {
  private time: Date = new Date()
  private path: string
  protected tag: string

  constructor(tag: string, path: string) {
    this.tag = tag
    this.path = path
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

  takeScreenshot(comment: string) {
    return browser
      .takeScreenshot()
      .then(async png => {
        const config = await browser.getProcessedConfig()

        const platform = config.capabilities.chromeOptions.mobileEmulation
          ? slugify(config.capabilities.chromeOptions.mobileEmulation.deviceName)
          : 'desktop'

        console.log(platform, 'browser.takeScreenshot()')

        const stream = fs.createWriteStream(
          `./screenshots/${platform}/${this.tag}-${this.time.getTime()}-screenshot.png` /* node >10 { recursive: true }*/
        )
        stream.write(Buffer.from(png, 'base64'))
        stream.end()
      })
      .catch(error => console.error('Cannot take screenshot', error))
  }
}
