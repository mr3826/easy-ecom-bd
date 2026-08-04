const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]{6,10}$/;
const META_PIXEL_ID_PATTERN = /^\d+$/;

function normalizeTrimmedString(value?: string | null) {
  return value?.trim() || "";
}

export function normalizeGtmContainerId(value?: string | null) {
  const normalized = normalizeTrimmedString(value).toUpperCase();
  return GTM_CONTAINER_ID_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeMetaPixelId(value?: string | null) {
  const normalized = normalizeTrimmedString(value);
  return META_PIXEL_ID_PATTERN.test(normalized) ? normalized : null;
}
