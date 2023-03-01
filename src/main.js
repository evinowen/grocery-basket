const fs = require('fs').promises
const { Builder, By, Key, until } = require('selenium-webdriver')
const Chrome = require('selenium-webdriver/chrome')
const { Firestore } = require('@google-cloud/firestore')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
const gcp_secret_client = new SecretManagerServiceClient()
const name_firestore_grocery_collection = process.env.FIRESTORE_GROCERY_COLLECTION || 'groceries'
const name_safeway_username_secret = process.env.SAFEWAY_USERNAME_SECRET
const name_safeway_password_secret = process.env.SAFEWAY_PASSWORD_SECRET

const sleep_time = process.env.SLEEP_TIME || 4000

const site_product = 'https://www.safeway.com/shop/product-details.PRODUCT_ID.html'

const elements = {
  'ADD_BUTTON': 'addButton_PRODUCT_ID',
  'QUANTITY_UP_BUTTON': 'inc_qtyInfo_PRODUCT_ID'
}

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

async function secret (name) {
  console.log('Get Secret', name)

  const [version] = await gcp_secret_client.accessSecretVersion({ name })
  return version.payload.data.toString()
}

async function screenshot (driver, title) {
  const image = await driver.takeScreenshot()
  await fs.writeFile(`output/${title}.png`, image, 'base64')
}

async function sign_in (driver) {
  const safeway_username = await secret(name_safeway_username_secret)
  const safeway_password = await secret(name_safeway_password_secret)
  console.log('Login', safeway_username, safeway_password)

  await driver.get('https://www.safeway.com/account/sign-in.html')

  await sleep(driver)

  await driver.findElement(By.id('onetrust-accept-btn-handler')).click()
  await driver.findElement(By.id('label-email')).sendKeys(safeway_username)
  await driver.findElement(By.id('label-password')).sendKeys(safeway_password)

  await screenshot(driver, 'sign-in-load')

  await driver.findElement(By.id('btnSignIn')).click()

  await sleep(driver)

  await screenshot(driver, 'sign-in-done')
}

async function add_product (driver, id, item) {
  const data = { ...item, id }
  console.log(`Add ${data.name || data.id}`)

  const item_url = boil(site_product, data)
  console.log('Goto Product', item_url)
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

async function list_groceries() {
  const result = new Map()
  const firestore = new Firestore()

  const snapshot = await firestore.collection(name_firestore_grocery_collection).get()
  snapshot.docs.forEach(doc => result.set(doc.id, doc.data()))

  return result
}

async function main () {
  const options = new Chrome.Options()
  options.addArguments('--headless=new')

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()

  await driver.manage().window().setRect({ width: 1280, height: 960 })

  await sign_in(driver)

  const list = await list_groceries()

  for (const [id, item] of list) {
    await add_product(driver, id, item)
  }

  await driver.quit()
}

main()
