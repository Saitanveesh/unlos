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
  if (!handler) {
    handler = createHandler();
  }
  return handler(req, res);
};
