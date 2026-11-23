import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../domain/errors.js';

interface ErrorBody {
  error: { code: string; message: string };
}

const body = (code: string, message: string): ErrorBody => ({ error: { code, message } });

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(body('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

/** Maps every error to `{ error: { code, message } }`. Never leaks stack traces. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.message));
    return;
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; ');
    res.status(400).json(body('VALIDATION_ERROR', message));
    return;
  }
  // Errors raised by express.json() (malformed JSON, body too large).
  if (typeof err === 'object' && err !== null && 'type' in err) {
    if (err.type === 'entity.parse.failed') {
      res.status(400).json(body('INVALID_JSON', 'Request body is not valid JSON'));
      return;
    }
    if (err.type === 'entity.too.large') {
      res.status(413).json(body('PAYLOAD_TOO_LARGE', 'Request body is too large'));
      return;
    }
  }
  console.error('Unhandled error:', err);
  res.status(500).json(body('INTERNAL_ERROR', 'Something went wrong'));
};
