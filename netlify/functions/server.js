const serverless = require('serverless-http');
const app = require('../../server.js').app;

module.exports.handler = serverless(app);