function normalizeBaseUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

function normalizePath(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export interface BkashIntegrationConfig {
  enabled: boolean;
  baseUrl: string;
  username: string;
  password: string;
  appKey: string;
  appSecret: string;
  createPaymentPath: string;
  executePaymentPath: string;
  queryPaymentPath: string;
  webhookSecret: string;
}

export function getBkashIntegrationConfig(): BkashIntegrationConfig {
  const baseUrl = normalizeBaseUrl(process.env.BKASH_BASE_URL);
  const username = process.env.BKASH_USERNAME?.trim() ?? "";
  const password = process.env.BKASH_PASSWORD?.trim() ?? "";
  const appKey = process.env.BKASH_APP_KEY?.trim() ?? "";
  const appSecret = process.env.BKASH_APP_SECRET?.trim() ?? "";

  return {
    enabled:
      hasValue(baseUrl) &&
      hasValue(username) &&
      hasValue(password) &&
      hasValue(appKey) &&
      hasValue(appSecret),
    baseUrl,
    username,
    password,
    appKey,
    appSecret,
    createPaymentPath: normalizePath(process.env.BKASH_CREATE_PAYMENT_PATH, "/checkout/create"),
    executePaymentPath: normalizePath(process.env.BKASH_EXECUTE_PAYMENT_PATH, "/checkout/execute"),
    queryPaymentPath: normalizePath(process.env.BKASH_QUERY_PAYMENT_PATH, "/checkout/query"),
    webhookSecret: process.env.BKASH_WEBHOOK_SECRET?.trim() || appSecret,
  };
}
