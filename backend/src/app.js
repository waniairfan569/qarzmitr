const path = require('path');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { env } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandlers');
const verifyToken = require('./middleware/verifyToken');

const app = express();

app.disable('x-powered-by');
// Trust one proxy hop so the limiter sees the real client address rather than
// the load balancer's, which would put every user in the same bucket.
app.set('trust proxy', 1);

// This server only ever answers JSON and serves ledger photographs, so the
// browser can be told to expect nothing else. Content-Security-Policy is turned
// off because it belongs to whatever serves the frontend, not to the API.
app.use(helmet({
  contentSecurityPolicy: false,
  // Images are fetched by the React app from a different origin, which the
  // default same-origin policy would block.
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
// A ledger photograph can reach 10 MB; JSON bodies never legitimately do, and
// leaving the limit high is free memory for anyone who wants to send junk.
app.use(express.json({ limit: '256kb' }));
app.use(cors({
  origin: env.frontendOrigin,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/uploads', verifyToken, express.static(path.resolve(__dirname, '../uploads'), {
  dotfiles: 'deny',
  index: false
}));
app.use('/auth', authRoutes);
app.use('/', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;