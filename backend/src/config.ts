import { z } from 'zod';

const idList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  )
  .pipe(z.array(z.string()).min(1, 'FEATURED_PRODUCT_IDS needs at least one id'));

/** An unset or empty variable (e.g. `SMTP_USER=` in .env.example) means "not configured". */
const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional());

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  FAKESTORE_BASE_URL: z.url().default('https://fakestoreapi.com'),
  CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
  FEATURED_PRODUCT_IDS: idList,
  TOP_RATED_COUNT: z.coerce.number().int().min(1).max(50).default(3),
  TOP_RATED_MIN_RATING: z.coerce.number().min(0).max(5).default(3),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_FROM: z.email(),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SALES_INBOX_EMAIL: z.email(),
}).refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASS), {
  message: 'set both SMTP_USER and SMTP_PASS, or neither',
  path: ['SMTP_USER'],
});

export interface Config {
  port: number;
  /** Reverse proxies in front of the API (nginx, ALB, CloudFront) whose X-Forwarded-For to trust. */
  trustProxy: number;
  fakeStoreBaseUrl: string;
  cacheTtlSeconds: number;
  featuredProductIds: string[];
  /** Category page rule: up to `count` products rated at least `minRating`. */
  topRated: { count: number; minRating: number };
  /** `auth` is set for relays that need credentials (e.g. SES SMTP); Mailpit needs none. */
  smtp: { host: string; port: number; from: string; auth?: { user: string; pass: string } };
  salesInboxEmail: string;
}

/** Parses and validates environment variables. Throws with a readable message if invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid configuration (see .env.example):\n${issues}`);
  }
  const e = result.data;
  return {
    port: e.PORT,
    trustProxy: e.TRUST_PROXY,
    fakeStoreBaseUrl: e.FAKESTORE_BASE_URL,
    cacheTtlSeconds: e.CACHE_TTL_SECONDS,
    featuredProductIds: e.FEATURED_PRODUCT_IDS,
    topRated: { count: e.TOP_RATED_COUNT, minRating: e.TOP_RATED_MIN_RATING },
    smtp: {
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      from: e.SMTP_FROM,
      ...(e.SMTP_USER && e.SMTP_PASS ? { auth: { user: e.SMTP_USER, pass: e.SMTP_PASS } } : {}),
    },
    salesInboxEmail: e.SALES_INBOX_EMAIL,
  };
}
