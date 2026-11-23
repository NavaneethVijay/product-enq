import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { enquiryInputSchema } from '../domain/enquiry.js';
import { TooManyRequestsError } from '../domain/errors.js';
import type { EnquiryService } from '../services/EnquiryService.js';

/** Each enquiry sends a real email, so limit how often one client can send them. */
export const ENQUIRY_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

export function enquiriesRouter(enquiries: EnquiryService): Router {
  const router = Router();

  const limiter = rateLimit({
    ...ENQUIRY_RATE_LIMIT,
    standardHeaders: 'draft-8', // RateLimit + Retry-After headers
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new TooManyRequestsError('Too many enquiries from this device. Please try again in a few minutes.')),
  });

  router.post('/', limiter, async (req, res) => {
    const input = enquiryInputSchema.parse(req.body ?? {});
    await enquiries.submit(input);
    res.status(202).json({ status: 'sent' });
  });

  return router;
}
