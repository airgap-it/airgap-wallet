import * as clipboardy from 'clipboardy'
import { by, element } from 'protractor'

import { AppPage } from './app.po'
import { accounts } from './constants'

const time = new Date()

describe('new App', () => {
  let page: AppPage

  beforeEach(async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000
    page = new AppPage('app-root', '/', time)
    await page.load()
  })

  it('should load introduction modal', async () => {
    const text = await page.getParagraphText()

    await page.takeScreenshot('introduction')
    /*
    await expect(text).toContain(
      'Start by adding coins to AirGap Wallet, you will also need the AirGap Vault application where your secret is securely stored.'
    )
*/
  })

  it('should dismiss introduction modal and show empty portfolio', async () => {
    const button = element(by.css('#dismiss-button'))
    await button.click()
    await page.waitForAngular()

    await page.takeScreenshot('portfolio')
  })

  it('should load add initial coin modal', async () => {
    const button = element(by.css('#add-initial-coin-button'))
    await button.click()
    await page.waitForAngular()

    await page.takeScreenshot('add-coin')
  })

  it('should open scan page', async () => {
    const button = element(by.css('#tab-button-scan'))
    await button.click()
    await page.waitForAngular()

    await page.takeScreenshot('scan')
  })

  it('should open exchange page', async () => {
    const button = element(by.css('#tab-button-exchange'))
    await button.click()
    await page.waitForAngular()

    await page.takeScreenshot('exchange')
  })

  it('should open settings page', async () => {
    const button = element(by.css('#tab-button-settings'))
    await button.click()
    await page.waitForAngular()

    await page.takeScreenshot('settings')
  })
  /*
  it('should open import page and import an account to portfolio', async () => {
    const button = element(by.css('#tab-button-settings'))
    await button.click()
    await page.waitForAngular()

    // clipboardy.writeSync(AccountSyncAe)

    const button2 = element(by.css('#paste-clipboard'))
    await button2.click()
    await page.waitForAngular()
    await page.takeScreenshot('import-ae')

    const button3 = element(by.css('#dismiss'))
    await button3.click()
    await page.waitForAngular()

    await button2.click()
    await page.waitForAngular()
    await page.takeScreenshot('import-ae')

    const button4 = element(by.css('#import'))
    await button4.click()
    await page.waitForAngular()
    await page.takeScreenshot('portfolio-import-ae')
  })*/

  it('should open import page and import an account to portfolio', async () => {
    /*
    const button0 = element(by.css('#dismiss-button'))
    await button0.click()
    await page.waitForAngular()
*/
    for (const account of accounts) {
      const button = element(by.css('#tab-button-settings'))
      await button.click()
      await page.waitForAngular()

      clipboardy.writeSync(account.sync)

      const button2 = element(by.css('#paste-clipboard'))
      await button2.click()
      await page.waitForAngular()
      await page.takeScreenshot(`import-${account.symbol}`)

      const button4 = element(by.css('#import'))
      await button4.click()
      await page.waitForAngular()
      await page.takeScreenshot(`portfolio-${account.symbol}`)

      const walletGroups = element.all(by.css('.walletGroups'))
      // console.log(walletGroups.getText())

      expect(walletGroups.count()).toBe(1)

      const firstWalletGroup = walletGroups.get(0)
      const mainWallet = firstWalletGroup.element(by.css('.mainWallet'))

      it('should have specific currency and amount', async () => {
        const text = await mainWallet.getText()
        expect(text).toContain(account.symbol)
        expect(text).toContain(account.shortAddress)
      })

      await mainWallet.click()
      await page.waitForAngular()

      await page.takeScreenshot(`tx-detail-${account.symbol}`)

      /*
			const buttonReceive = element(by.css('#receive'))
			await buttonReceive.click()
			await page.waitForAngular()
			await page.takeScreenshot('ae-tx-detail-receive')
	*/

      const buttonSend = element(by.css('#send'))
      await buttonSend.click()
      await page.waitForAngular()
      await page.takeScreenshot(`tx-detail-send-${account.symbol}`)

      await page.sleep(100)

      const inputContainer = element(by.css('#address-input'))
      const input = inputContainer.element(by.css('.native-textarea'))
      input.sendKeys(account.toAddress)

      await page.takeScreenshot(`tx-detail-send-address-${account.symbol}`)

      const amountInputContainer = element(by.css('#amount-input'))
      const amountInput = amountInputContainer.element(by.css('.native-input'))
      amountInput.sendKeys(account.amount)

      await page.takeScreenshot(`tx-detail-send-amount-${account.symbol}`)

      const prepareButton = element(by.css('#prepare'))
      prepareButton.click()
      await page.waitForAngular()

      await page.takeScreenshot(`interaction-${account.symbol}`)

      const offlineButton = element(by.css('#offline'))
      offlineButton.click()
      await page.waitForAngular()

      await page.takeScreenshot(`qr-${account.symbol}`)

      const qrCode = element(by.css('#qr'))
      qrCode.click()
      await page.waitForAngular()

      const preparedTxClipboard = clipboardy.readSync()

      // expect(preparedTxClipboard).toEqual(account.preparedTx)

      const doneButton = element(by.css('#done'))
      doneButton.click()
      await page.waitForAngular()

      await mainWallet.click()
      await page.waitForAngular()

      const buttonPopover = element(by.css('#edit-popover'))
      await buttonPopover.click()
      await page.waitForAngular()
      await page.takeScreenshot(`tx-detail-popover-${account.symbol}`)

      const buttonDelete = element(by.css('#delete'))
      await buttonDelete.click()
      await page.waitForAngular()

      const alertButtons = element.all(by.css('.alert-button-inner'))
      const deleteButton = alertButtons.last()
      await deleteButton.click()
      await page.waitForAngular()

      await page.takeScreenshot(`portfolio-deleted-${account.symbol}`)
    }
  })
})
