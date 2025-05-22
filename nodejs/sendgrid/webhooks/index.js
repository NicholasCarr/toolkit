import express from 'express';
import fs from 'fs';
import https from 'https';

// PROD/DEV MANAGEMENT
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  console.log({
    message: "Running in development mode",
  });
  dotenv.config();
} else {
  console.log({
    message: "Running in production mode",
  });
}

// Routes
import sendGridRoutes from './routes/sendgridRoutes.js';
const app = express();

// Middleware to validate requests
app.use((req, res, next) => {
  // Check if request is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are supported.' });
  }

  // Check if hostname is allowed
  const allowedDomains = [ 'efde2de15435.breachguard.com.au' ];
  const hostname = req.hostname;
  
  if (!allowedDomains.includes(hostname)) {
    return res.status(404).json({ error: 'Not found' });
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}))

app.use(express.static('public'));

// SendGrid
app.use('/sendgrid', sendGridRoutes);

https.createServer({
  key: fs.readFileSync('./ssl/breachguard.com.au.key'),
  cert: fs.readFileSync('./ssl/breachguard.com.au.cer'),
  ca: fs.readFileSync('./ssl/chain.cer')
}, app)
  .listen(process.env.API_PORT, function () {
    console.log('Webhook Server listening on port ' + process.env.API_PORT)
  })