'use strict';

/**
 * Vercel Serverless Function entry point for UNLOS.
 *
 * This handler bridges Vercel's Serverless Function execution model
 * (req: IncomingMessage, res: ServerResponse) directly to the UNLOS
 * application logic while caching the initialized handler in module scope
 * across warm Lambda invocations.
 */

const { createHandler } = require('../server');

let handler = null;

module.exports = async function (req, res) {
  try {
    if (!handler) {
      handler = createHandler();
    }
    return await handler(req, res);
  } catch (err) {
    console.error('[UNLOS Vercel Serverless Error]', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        error: 'Serverless Function Invocation Error',
        message: err.message,
        name: err.name,
        hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
        hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
        nodeVersion: process.version,
        stack: err.stack
      }, null, 2));
    }
  }
};
