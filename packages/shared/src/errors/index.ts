/** SokoOS machine-readable error codes — used by the API filter and UI mapping */

export const ErrorCodes = {
  // 400
  VALIDATION_ERROR:         'VALIDATION_ERROR',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_STOCK:       'INSUFFICIENT_STOCK',
  NEGATIVE_STOCK_BLOCKED:   'NEGATIVE_STOCK_BLOCKED',
  BATCH_REQUIRED:           'BATCH_REQUIRED',
  EXPIRED_BATCH:            'EXPIRED_BATCH',
  REASON_REQUIRED:          'REASON_REQUIRED',
  OVER_RECEIPT:             'OVER_RECEIPT',
  OVER_REFUND_QUANTITY:     'OVER_REFUND_QUANTITY',
  LINE_NOT_ON_PO:           'LINE_NOT_ON_PO',
  // 401
  UNAUTHENTICATED:          'UNAUTHENTICATED',
  MFA_REQUIRED:             'MFA_REQUIRED',
  MFA_INVALID:              'MFA_INVALID',
  MFA_ATTEMPTS_EXHAUSTED:   'MFA_ATTEMPTS_EXHAUSTED',
  // 403
  PERMISSION_DENIED:        'PERMISSION_DENIED',
  TENANT_ACCESS_DENIED:     'TENANT_ACCESS_DENIED',
  BRANCH_SCOPE_REQUIRED:    'BRANCH_SCOPE_REQUIRED',
  ADMIN_PERMISSION_LOCKED:  'ADMIN_PERMISSION_LOCKED',
  // 404
  RESOURCE_NOT_FOUND:       'RESOURCE_NOT_FOUND',
  // 405
  METHOD_NOT_ALLOWED:       'METHOD_NOT_ALLOWED',
  // 409
  DUPLICATE_EMAIL:          'DUPLICATE_EMAIL',
  DUPLICATE_PHONE:          'DUPLICATE_PHONE',
  DUPLICATE_SLUG:           'DUPLICATE_SLUG',
  DUPLICATE_SKU:            'DUPLICATE_SKU',
  DUPLICATE_BARCODE:        'DUPLICATE_BARCODE',
  DUPLICATE_BRANCH_CODE:    'DUPLICATE_BRANCH_CODE',
  DUPLICATE_SUPPLIER_NAME:  'DUPLICATE_SUPPLIER_NAME',
  DUPLICATE_CATEGORY_NAME:  'DUPLICATE_CATEGORY_NAME',
  DUPLICATE_BRAND_NAME:     'DUPLICATE_BRAND_NAME',
  STALE_RESOURCE:           'STALE_RESOURCE',
  IDEMPOTENCY_KEY_REUSED:   'IDEMPOTENCY_KEY_REUSED',
  DAY_ALREADY_CLOSED:       'DAY_ALREADY_CLOSED',
  // 422
  ACCOUNT_LOCKED:           'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED:        'ACCOUNT_SUSPENDED',
  EMAIL_NOT_VERIFIED:       'EMAIL_NOT_VERIFIED',
  PHONE_NOT_VERIFIED:       'PHONE_NOT_VERIFIED',
  INVITATION_EXPIRED:       'INVITATION_EXPIRED',
  TOKEN_INVALID:            'TOKEN_INVALID',
  TOKEN_EXPIRED:            'TOKEN_EXPIRED',
  TOKEN_ATTEMPTS_EXHAUSTED: 'TOKEN_ATTEMPTS_EXHAUSTED',
  // 429
  RATE_LIMITED:             'RATE_LIMITED',
  // 500
  INTERNAL_ERROR:           'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
    requestId: string;
  };
}

export class SokoError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly httpStatus: number = 400,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'SokoError';
  }
}

export class NotFoundError extends SokoError {
  constructor(resource: string, id?: string) {
    super(ErrorCodes.RESOURCE_NOT_FOUND, id ? `${resource} not found` : `${resource} not found`, 404);
  }
}

export class PermissionError extends SokoError {
  constructor(permission?: string) {
    super(ErrorCodes.PERMISSION_DENIED, permission ? `Missing permission: ${permission}` : 'Permission denied', 403);
  }
}

export class TenantError extends SokoError {
  constructor() {
    super(ErrorCodes.TENANT_ACCESS_DENIED, 'You do not have access to this business', 403);
  }
}

export class ConflictError extends SokoError {
  constructor(code: ErrorCode, message: string, details?: Record<string, string[]>) {
    super(code, message, 409, details);
  }
}

export class StockError extends SokoError {
  constructor(message: string, code: ErrorCode = ErrorCodes.INSUFFICIENT_STOCK) {
    super(code, message, 409);
  }
}
