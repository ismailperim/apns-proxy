const http2 = require('http2');
const express = require('express');
const app = express();
const APNS_HOST = process.env.APNS_ENV === 'sandbox' 
  ? 'https://api.sandbox.push.apple.com' 
  : 'https://api.push.apple.com';

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/send', async (req, res) => {
  const { device_token, jwt, title, body, topic, badge, sound } = req.body;

  if (!device_token || !jwt || !title || !body || !topic) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: device_token, jwt, title, body, topic' 
    });
  }

  await new Promise((resolve) => {
    const client = http2.connect(APNS_HOST);
    const payload = JSON.stringify({
      aps: { 
        alert: { title, body }, 
        sound: sound ?? 'default',
        ...(badge !== undefined && { badge })
      }
    });

    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${device_token}`,
      'authorization': `bearer ${jwt}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload)
    });

    request.write(payload);
    request.end();

    request.on('response', (headers) => {
      const status = headers[':status'];
      let responseBody = '';
      request.on('data', chunk => responseBody += chunk);
      request.on('end', () => {
        client.close();
        res.json({ success: status === 200, apns_status: status, response: responseBody });
        resolve();
      });
    });

    request.on('error', (err) => {
      client.close();
      res.status(500).json({ success: false, error: err.message });
      resolve();
    });
  });
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => console.log(`APNs proxy listening on port ${PORT}`));