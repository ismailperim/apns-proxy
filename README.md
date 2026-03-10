# apns-proxy

A lightweight HTTP/1.1 → HTTP/2 proxy for Apple Push Notification service (APNs).

Useful for tools like **n8n**, **Zapier**, or any HTTP client that doesn't support HTTP/2.

## Running
```bash
docker compose up -d
```

Or with a custom port:
```bash
PORT=8080 docker compose up -d
```

## API

### Health check
```
GET /health
```

### Send push notification
```
POST /send
Content-Type: application/json

{
  "device_token": "abc123...",
  "jwt":          "eyJhbGci...",
  "topic":        "com.yourcompany.yourapp",
  "title":        "Hello",
  "body":         "World",
  "badge":        1,
  "sound":        "default"
}
```

| Field | Required | Description |
|---|---|---|
| `device_token` | ✅ | APNs device token |
| `jwt` | ✅ | Signed JWT (ES256) — see below |
| `topic` | ✅ | App bundle ID |
| `title` | ✅ | Notification title |
| `body` | ✅ | Notification body |
| `badge` | ❌ | Badge count |
| `sound` | ❌ | Sound name (default: `default`) |

### Response
```json
{ "success": true, "apns_status": 200, "response": "" }
```

## Generating a JWT

You need a `.p8` key file from [Apple Developer Portal](https://developer.apple.com) → Keys → Apple Push Notifications service.

### Node.js
```javascript
const jwt = require('jsonwebtoken');
const fs  = require('fs');

const token = jwt.sign({}, fs.readFileSync('AuthKey_XXXXXXXXXX.p8'), {
  algorithm: 'ES256',
  keyid:     'YOUR_KEY_ID',
  issuer:    'YOUR_TEAM_ID',
  expiresIn: '1h'
});
```

### n8n Code Node
```javascript
const crypto = require('crypto');

const privateKey = `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`;

function base64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const header  = base64url(JSON.stringify({ alg: 'ES256', kid: 'YOUR_KEY_ID' }));
const payload = base64url(JSON.stringify({ iss: 'YOUR_TEAM_ID', iat: Math.floor(Date.now() / 1000) }));

const sign = crypto.createSign('SHA256');
sign.update(`${header}.${payload}`);
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');

return [{ json: { jwt_token: `${header}.${payload}.${signature}` } }];
```

## Sandbox vs Production

By default the proxy uses **production** APNs (`api.push.apple.com`).  
For sandbox set the environment variable:
```bash
APNS_ENV=sandbox docker compose up -d
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3456` | HTTP port |
| `APNS_ENV` | `production` | `production` or `sandbox` |