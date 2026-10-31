// Prints a Chrome Web Store API access token for the service account
// whose JSON key is in CHROME_SERVICE_ACCOUNT_JSON.
import { createSign } from 'node:crypto'

const key = JSON.parse(process.env.CHROME_SERVICE_ACCOUNT_JSON)
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
const now = Math.floor(Date.now() / 1000)

const jwt = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
  iss: key.client_email,
  scope: 'https://www.googleapis.com/auth/chromewebstore',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 600,
})
const signature = createSign('RSA-SHA256').update(jwt).sign(key.private_key, 'base64url')

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${jwt}.${signature}`,
  }),
})
const body = await res.json()
if (!res.ok) {
  console.error('Could not get a Chrome Web Store token:', body)
  process.exit(1)
}
console.log(body.access_token)
