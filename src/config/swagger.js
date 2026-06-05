'use strict';

const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Rework Evidence API',
      version: '1.0.0',
      description: 'REST API documentation',
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: 'Local development',
      },
    ],
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Home' },
      { name: 'Testimonials' },
      { name: 'How We Work' },
      { name: 'Services' },
      { name: 'Service Cards' },
      { name: 'Clients' },
      { name: 'Companies' },
      { name: 'Blog' },
      { name: 'Blog Posts' },
      { name: 'Config' },
      { name: 'Users' },
      { name: 'Diagnosis' },
      { name: 'Site Content' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../routes/**/*.js'),
    path.join(__dirname, '../modules/**/*.routes.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
