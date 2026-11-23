import { z } from 'zod';

/** Rejects CR/LF so values can never inject extra email headers. */
const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !/[\r\n]/.test(value), 'must be a single line');

/** Treats "" (an untouched optional form field) as not provided. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema.optional());

export const enquiryInputSchema = z.object({
  productId: z.string().trim().min(1).max(64),
  name: singleLine(100).pipe(z.string().min(1, 'is required')),
  email: z.string().trim().max(254).pipe(z.email('must be a valid email address')),
  phone: optional(singleLine(30).pipe(z.string().regex(/^[0-9+()\-.\s]+$/, 'must be a valid phone number'))),
  message: optional(z.string().trim().max(2000)),
  /**
   * Honeypot: hidden in the form, so people leave it empty but simple bots fill it in.
   * Accepted by validation (bots get no signal); EnquiryService silently drops such enquiries.
   */
  website: z.string().max(200).optional(),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
