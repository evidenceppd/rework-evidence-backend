'use strict';

const cors = require('cors');
const env = require('../config/env');

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || env.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const err = new Error(`CORS policy: origin '${origin}' is not allowed`);
      err.status = 403;
      callback(err);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

module.exports = cors(corsOptions);


