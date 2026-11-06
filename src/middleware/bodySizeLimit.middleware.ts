import express from 'express';

// Strict size limits for JSON and URL-encoded bodies to prevent DoS attacks
export const jsonBodyLimitMiddleware = express.json({ limit: '1mb' });
export const urlencodedBodyLimitMiddleware = express.urlencoded({ extended: true, limit: '1mb' });
