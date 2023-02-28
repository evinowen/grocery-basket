const fs = require('fs').promises
const { Builder, By, Key, until } = require('selenium-webdriver')
const Chrome = require('selenium-webdriver/chrome')

const sleep_time = process.env.SLEEP_TIME || 4000

const site_product = 'https://www.safeway.com/shop/product-details.PRODUCT_ID.html'

const elements = {
  'ADD_BUTTON': 'addButton_PRODUCT_ID',
  'QUANTITY_UP_BUTTON': 'inc_qtyInfo_PRODUCT_ID'
}

const list = new Map([
  ['196050889', { quantity: 1 }],
  ['970003224', { quantity: 1 }],
  ['138250149', { quantity: 1 }],
  ['184710086', { quantity: 1 }],
  ['184650215', { quantity: 1 }],
  ['970081327', { quantity: 1 }],
  ['194050042', { quantity: 1 }],
  ['184700054', { quantity: 1 }],
  ['960019675', { quantity: 1 }],
  ['960453995', { quantity: 1 }],
  ['970020211', { quantity: 1 }],
  ['960109455', { quantity: 1 }],
  ['186190041', { quantity: 1 }],
  ['960109669', { quantity: 1 }],
  ['960143719', { quantity: 1 }],
  ['960542251', { quantity: 1 }],
  ['188020255', { quantity: 1 }],
  ['960131438', { quantity: 1 }],
  ['960131566', { quantity: 1 }],
  ['125300006', { quantity: 1 }],
  ['125300108', { quantity: 1 }],
  ['970021707', { quantity: 1 }],
  ['960019121', { quantity: 1 }],
  ['184710082', { quantity: 1 }],
  ['960044446', { quantity: 1 }],
  ['119030197', { quantity: 1 }],
  ['120020082', { quantity: 1 }],
  ['960167431', { quantity: 1 }],
  ['195150180', { quantity: 1 }],
  ['189010622', { quantity: 1 }]
])

async function sleep (driver, coefficent = 1.0) {
  const time = parseInt(sleep_time * coefficent, 10)
  console.log(`wait (${time})...`)
  await driver.sleep(time)
}

function boil (value, data) {
  const { id } = data

  let result = value

  result = result.replace('PRODUCT_ID', id)

  return result
}

async function screenshot (driver, title) {
  const image = await driver.takeScreenshot()
  await fs.writeFile(`screens/${title}.png`, image, 'base64')
}

async function sign_in (driver) {
  await driver.get('https://www.safeway.com/account/sign-in.html')

  await sleep(driver)

  await driver.findElement(By.id('onetrust-accept-btn-handler')).click()
  await driver.findElement(By.id('label-email')).sendKeys(process.env.SAFEWAY_USERNAME)
  await driver.findElement(By.id('label-password')).sendKeys(process.env.SAFEWAY_PASSWORD)

  await screenshot(driver, 'sign-in-load')

  await driver.findElement(By.id('btnSignIn')).click()

  await sleep(driver)

  await screenshot(driver, 'sign-in-done')
}

async function add_product (driver, id, item) {
  const data = { ...item, id }

  const item_url = boil(site_product, data)
  console.log('Goto Product', data.id, item, item_url)
  await driver.get(item_url)

  await sleep(driver)

  await screenshot(driver, `product-${id}-loaded`)

  for (let i = 0; i < item.quantity; i++) {
    const button_add_id = boil(elements.ADD_BUTTON, data)
    const button_quantity_up_id = boil(elements.QUANTITY_UP_BUTTON, data)

    let ele
    try {
      ele = driver.findElement(By.id(button_add_id))
    } catch (err) {
      try {
        ele = driver.findElement(By.id(button_quantity_up_id))
      } catch (err) {
        console.log('No button for product', id)
        continue
      }
    }

    await ele.click()

    await sleep(driver, 0.5)

    await screenshot(driver, `product-${id}-final`)
  }
}

async function main () {
  const options = new Chrome.Options()
  options.addArguments('--headless=new')

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()

  await driver.manage().window().setRect({ width: 1280, height: 960 })

  console.log('Login', process.env.SAFEWAY_USERNAME, process.env.SAFEWAY_PASSWORD)
  await sign_in(driver)

  for (const [id, item] of list) {
    await add_product(driver, id, item)
  }

  await driver.quit()
}

main()
