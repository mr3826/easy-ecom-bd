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

export interface CourierIntegrationConfig {
  enabled: boolean;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  createShipmentPath: string;
  syncStatusPath: string;
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

export function getPathaoIntegrationConfig(): CourierIntegrationConfig {
  const baseUrl = normalizeBaseUrl(process.env.PATHAO_BASE_URL);
  const clientId = process.env.PATHAO_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.PATHAO_CLIENT_SECRET?.trim() ?? "";
  const username = process.env.PATHAO_USERNAME?.trim() ?? "";
  const password = process.env.PATHAO_PASSWORD?.trim() ?? "";

  return {
    enabled:
      hasValue(baseUrl) &&
      hasValue(clientId) &&
      hasValue(clientSecret) &&
      hasValue(username) &&
      hasValue(password),
    baseUrl,
    clientId,
    clientSecret,
    username,
    password,
    createShipmentPath: normalizePath(process.env.PATHAO_CREATE_SHIPMENT_PATH, "/shipments"),
    syncStatusPath: normalizePath(process.env.PATHAO_SYNC_STATUS_PATH, "/shipments/status"),
    webhookSecret: process.env.PATHAO_WEBHOOK_SECRET?.trim() || clientSecret,
  };
}

export function getSteadfastIntegrationConfig(): CourierIntegrationConfig {
  const baseUrl = normalizeBaseUrl(process.env.STEADFAST_BASE_URL);
  const clientId = process.env.STEADFAST_API_KEY?.trim() ?? "";
  const clientSecret = process.env.STEADFAST_SECRET_KEY?.trim() ?? "";

  return {
    enabled: hasValue(baseUrl) && hasValue(clientId) && hasValue(clientSecret),
    baseUrl,
    clientId,
    clientSecret,
    username: process.env.STEADFAST_USERNAME?.trim() ?? "",
    password: process.env.STEADFAST_PASSWORD?.trim() ?? "",
    createShipmentPath: normalizePath(process.env.STEADFAST_CREATE_SHIPMENT_PATH, "/shipments"),
    syncStatusPath: normalizePath(process.env.STEADFAST_SYNC_STATUS_PATH, "/shipments/status"),
    webhookSecret: process.env.STEADFAST_WEBHOOK_SECRET?.trim() || clientSecret,
  };
}
