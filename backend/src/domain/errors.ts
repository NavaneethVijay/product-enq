/** Base class for errors that map to a known HTTP response. */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
}

export class TooManyRequestsError extends AppError {
  readonly status = 429;
  readonly code = 'RATE_LIMITED';
}

/** A dependency we call (product source, email provider) failed. */
export class UpstreamError extends AppError {
  readonly status = 502;
  readonly code = 'UPSTREAM_ERROR';
}
