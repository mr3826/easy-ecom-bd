export function buildOrderTrackingHref(orderCode?: string | null) {
  const code = orderCode?.trim();
  if (!code) return "/track-order";
  return `/track-order?${new URLSearchParams({ code }).toString()}`;
}
