// tslint:disable:no-implicit-dependencies
import * as clipboardy from 'clipboardy'
import { browser, by, element } from 'protractor'

import { accounts } from './constants'
import { AccountImportPage } from './pages/account-import.po'
import { AccountTransactionListPage } from './pages/account-transaction-list.po'
import { AppPage } from './pages/app.po'
import { PortfolioPage } from './pages/portfolio.po'
import { SettingsPage } from './pages/settings.po'
import { TransactionPreparePage } from './pages/transaction-prepare.po'
import { TransactionQrPage } from './pages/transaction-qr.po'

const time: Date = new Date()

describe('AirGap Wallet', () => {
  let page: AppPage
  let portfolioPage: PortfolioPage
  let settingsPage: SettingsPage
  let accountImportPage: AccountImportPage
  let accountTransactionListPage: AccountTransactionListPage
  let transactionQrPage: TransactionQrPage
  let transactionPreparePage: TransactionPreparePage

  beforeAll(async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000
    page = new AppPage('app-root', '/', time)

    await page.load()
  })

  beforeEach(async () => {
    page = new AppPage('app-root', '/', time)
    portfolioPage = new PortfolioPage('app-root', '/tabs/portfolio', time)
    settingsPage = new SettingsPage('app-root', '/tabs/settings', time)
    accountImportPage = new AccountImportPage('app-root', null, time)
    accountTransactionListPage = new AccountTransactionListPage('app-root', null, time)
    transactionQrPage = new TransactionQrPage('app-root', null, time)
    transactionPreparePage = new TransactionPreparePage('app-root', null, time)
    browser
      .executeScript(() => {
        localStorage.clear()
      })
      .catch(console.error)
    await page.load()
  })

  it('should load introduction modal', async () => {
    await page.takeScreenshot('introduction')

    const text: string = await page.getParagraphText()

    await expect(text).toContain(
      'Start by adding coins to AirGap Wallet, you will also need the AirGap Vault application where your secret is securely stored.'
    )
  })

  it('should dismiss introduction modal and show empty portfolio', async () => {
    await page.clickDismissButton()

    await page.takeScreenshot('portfolio')
  })

  it('should load add initial coin modal', async () => {
    await page.clickDismissButton()

    await portfolioPage.clickAddInitialCoin()

    await page.takeScreenshot('add-coin')
  })

  it('should open scan page', async () => {
    await page.clickDismissButton()

    await page.clickScanTab()

    await page.sleep(500)

    await page.takeScreenshot('scan')
  })

  it('should open exchange page', async () => {
    await page.clickDismissButton()

    await page.clickExchangeTab()

    await page.takeScreenshot('exchange')
  })

  it('should open settings page', async () => {
    await page.clickDismissButton()

    await page.clickSettingsTab()

    await page.takeScreenshot('settings')
  })

  fit('should open import page and import an account to portfolio', async () => {
    await page.clickDismissButton()

    for (const account of accounts) {
      await page.clickSettingsTab()

      clipboardy.writeSync(account.sync)

      await settingsPage.clickPasteFromClipboard()
      await page.takeScreenshot(`import-${account.symbol}`)

      await accountImportPage.clickImport()
      await page.takeScreenshot(`portfolio-${account.symbol}`)

      /*
      // TODO: Implement performance testing
      browser
        .manage()
        .logs()
        .get('performance')
        .then(browserLogs => {
          // console.log('logs', browserLogs)
          browserLogs.forEach(browserLog => {
            const message = JSON.parse(browserLog.message).message
            if (message.method === 'Network.responseReceived') {
              if (message.params && message.params.response && message.params.response.url) {
                const url: string = message.params.response.url
                if (
                  url === 'data:text/html,<html></html>' ||
                  url.startsWith('http://localhost:4200/') ||
                  url.startsWith('data:application/octet-stream;base64,') // && url.endsWith('.js')
                ) {
                  return
                }
                console.log(message)
                console.log(message.params.response.securityDetails)
                console.log(message.params.response.timing)
              }
            }
          })
        })
        .catch(console.error)
      */

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
