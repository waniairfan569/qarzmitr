const path = require('path');
const cors = require('cors');
const express = require('express');
const { env } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandlers');
const verifyToken = require('./middleware/verifyToken');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: env.frontendOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
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