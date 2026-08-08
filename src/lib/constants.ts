export const TAX_RATE = 0.15;

/** The VAT rates selectable on invoices and bills — 0% (zero-rated/exempt), 5% (pre-2020 standard rate), 15% (current standard rate). */
export const TAX_RATES = [0, 0.05, 0.15] as const;

/** Tax invoices above this amount (SAR) require admin/accountant approval before posting. */
export const TAX_INVOICE_APPROVAL_THRESHOLD = 10000;

/** Staff passwords must be changed after this many days, enforced on every request in (app)/layout.tsx. */
export const PASSWORD_MAX_AGE_DAYS = 90;
