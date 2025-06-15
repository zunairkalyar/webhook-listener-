import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.post('/api/webhook', (req, res) => {
  const secret = process.env.SHOPIFY_SHARED_SECRET || '';
  const hmacHeader = req.get('X-Shopify-Hmac-SHA256') || '';
  const digest = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('base64');

  const valid =
    hmacHeader &&
    crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));

  if (valid) {
    io.emit('newWebhookData', req.body);
    res.status(200).send({ received: true });
  } else {
    res.status(401).send('Invalid webhook signature');
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
