const fs = require('fs').promises
const { Builder, By, Key, until } = require('selenium-webdriver')
const Chrome = require('selenium-webdriver/chrome')
const { Firestore } = require('@google-cloud/firestore')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
const gcp_secret_client = new SecretManagerServiceClient()
const sendgrid_mail = require('@sendgrid/mail')

const name_firestore_grocery_collection = process.env.FIRESTORE_GROCERY_COLLECTION || 'groceries'
const name_safeway_username_secret = process.env.SAFEWAY_USERNAME_SECRET || null
const name_safeway_password_secret = process.env.SAFEWAY_PASSWORD_SECRET || null
const name_cvv_code_secret = process.env.CVV_CODE_SECRET || null

const sendgrid_api_key_secret = process.env.SENDGRID_API_KEY_SECRET || null
const sendgrid_from_email = process.env.SENDGRID_FROM_EMAIL
const sendgrid_to_email = process.env.SENDGRID_TO_EMAIL
const output_bucket = process.env.OUTPUT_BUCKET

const sleep_time = process.env.SLEEP_TIME || 4000

const site_login = 'https://www.safeway.com/account/sign-in.html'
const site_prebook = 'https://www.safeway.com/erums/store/prebook'
const site_product = 'https://www.safeway.com/shop/product-details.PRODUCT_ID.html'
const site_shopping_cart = 'https://www.safeway.com/erums/cart'
const site_checkout = 'https://www.safeway.com/erums/checkout'

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
  console.log('Login', safeway_username, '•'.repeat(safeway_password.length))

  await driver.get(site_login)

  await sleep(driver)

  await driver.findElement(By.id('onetrust-accept-btn-handler')).click()
  await driver.findElement(By.id('label-email')).sendKeys(safeway_username)
  await driver.findElement(By.id('label-password')).sendKeys(safeway_password)

  await screenshot(driver, 'sign-in-load')

  await driver.findElement(By.id('btnSignIn')).click()

  await sleep(driver)

  await screenshot(driver, 'sign-in-done')
}

async function prebook (driver) {
  console.log('Pre-Book')

  await driver.get(site_prebook)

  await sleep(driver)
  await screenshot(driver, 'prebook-load')

  await driver.findElement(By.css('app-delivery-window-type')).findElement(By.css('div')).click()
  await sleep(driver, 0.25)

  await driver.findElement(By.css('app-delivery-window-type')).findElement(By.css('button')).click()
  await sleep(driver)

  await screenshot(driver, 'prebook-done')

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

    try {
      await driver.findElement(By.id(button_add_id)).click()
    } catch (err) {
      try {
        await driver.findElement(By.id(button_quantity_up_id)).click()
      } catch (err) {
        console.log('No button for product', id)
        continue
      }
    }

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

async function shopping_cart (driver) {
  console.log('Open Shopping Cart')

  await driver.get(site_shopping_cart)

  await sleep(driver)
  await screenshot(driver, 'shopping-cart')
}

async function checkout (driver) {
  if (name_cvv_code_secret === null) {
    console.log('No CVV code given to place order, skipping checkout')
    return
  }

  const cvv_code = await secret(name_cvv_code_secret)

  console.log('Open Checkout')

  await driver.get(site_checkout)
  await sleep(driver)

  await screenshot(driver, 'checkout-load')

  try {
    await driver.findElement(By.css('app-order-info')).findElement(By.css('button')).click()
    await sleep(driver, 0.25)
  } catch {
    console.log('Unable to click "Continue" prompt for Order Info view')
  }

  await screenshot(driver, 'checkout-payment')

  await driver.findElement(By.id('cvv_field')).sendKeys(cvv_code)
  await sleep(driver, 0.25)

  await screenshot(driver, 'checkout-payment-cvv')

  await driver.findElement(By.id('placeOrderSnap')).click()
  await sleep(driver)

  await screenshot(driver, 'checkout-payment-done')
}

async function notify () {
  const sendgrid_api_key = await secret(sendgrid_api_key_secret)
  sendgrid_mail.setApiKey(sendgrid_api_key)

  const date = new Date
  const date_string = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`

  const message = {
    to: sendgrid_to_email,
    from: sendgrid_from_email,
    subject: `Groceries Shopped for ${date_string}`,
    html: `
      <h1>Groceries Shopped for ${date_string}</h1>
      <br />
      <img src="https://storage.googleapis.com/${output_bucket}/prebook-done.png" />
      <br />
      <img src="https://storage.googleapis.com/${output_bucket}/shopping-cart.png" />
      <br />
      <img src="https://storage.googleapis.com/${output_bucket}/checkout-done.png" />
      <br />
    `
  }

  try {
    await sendgrid_mail.send(message)
  } catch (error) {
    console.error(error)

    if (error.response) {
      console.error(error.response.body)
    }
  }
}

async function main () {
  const options = new Chrome.Options()
  options.addArguments('--headless=new')

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()

  await driver.manage().window().setRect({ width: 1280, height: 960 })

  await sign_in(driver)

  await prebook(driver)

  const list = await list_groceries()

  for (const [id, item] of list) {
    await add_product(driver, id, item)
  }

  await shopping_cart(driver)

  await checkout(driver)

  await driver.quit()

  await notify()
}

main()
