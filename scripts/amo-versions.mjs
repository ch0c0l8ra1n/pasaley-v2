// Prints the add-on's latest versions on addons.mozilla.org, one per line,
// using the API key in AMO_JWT_ISSUER and AMO_JWT_SECRET.
import { createHmac, randomUUID } from 'node:crypto'

const id = process.argv[2]
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
const now = Math.floor(Date.now() / 1000)

const jwt = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({
  iss: process.env.AMO_JWT_ISSUER,
  jti: randomUUID(),
  iat: now,
  exp: now + 60,
})
const signature = createHmac('sha256', process.env.AMO_JWT_SECRET).update(jwt).digest('base64url')

const res = await fetch(`https://addons.mozilla.org/api/v5/addons/addon/${id}/versions/?filter=all_with_unlisted`, {
  headers: { Authorization: `JWT ${jwt}.${signature}` },
})
const body = await res.json()
if (!res.ok) {
  console.error('Could not read add-on versions from AMO:', body)
  process.exit(1)
}
for (const version of body.results) console.log(version.version)
