import type {
  ProductCondition,
  ProductDimensionUnit,
  ProductMetadata,
  ProductSource,
  ProductVariantGroup,
  ProductWeightUnit,
} from "@/lib/domain";

export const productConditionOptions: Array<{ label: string; value: ProductCondition }> = [
  { label: "New", value: "new" },
  { label: "Used", value: "used" },
  { label: "Refurbished", value: "refurbished" },
];

export const productSourceOptions: Array<{ label: string; value: ProductSource }> = [
  { label: "Manual", value: "manual" },
  { label: "Bulk upload", value: "bulk" },
];

export const productWeightUnitOptions: Array<{ label: string; value: ProductWeightUnit }> = [
  { label: "g", value: "g" },
  { label: "kg", value: "kg" },
  { label: "lb", value: "lb" },
  { label: "oz", value: "oz" },
];

export const productDimensionUnitOptions: Array<{ label: string; value: ProductDimensionUnit }> = [
  { label: "cm", value: "cm" },
  { label: "mm", value: "mm" },
  { label: "in", value: "in" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown) {
  const trimmed = normalizeString(value);
  return trimmed || null;
}

function parseBooleanLike(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "1", "on", "yes"].includes(value.toLowerCase());
  }
  return fallback;
}

function parseNumberLike(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeOptionalNumber(value: unknown) {
  const parsed = parseNumberLike(value);
  return parsed === null ? null : parsed;
}

function normalizeOptionalInteger(value: unknown) {
  const parsed = parseNumberLike(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function normalizeCondition(value: unknown): ProductCondition {
  return productConditionOptions.some((option) => option.value === value) ? (value as ProductCondition) : "new";
}

function normalizeWeightUnit(value: unknown) {
  return productWeightUnitOptions.some((option) => option.value === value) ? (value as ProductWeightUnit) : "kg";
}

function normalizeDimensionUnit(value: unknown) {
  return productDimensionUnitOptions.some((option) => option.value === value) ? (value as ProductDimensionUnit) : "cm";
}

export function normalizeProductVariantGroup(value: unknown): ProductVariantGroup {
  const source = isRecord(value) ? value : {};
  const options = Array.isArray(source.options)
    ? source.options.map((item) => normalizeString(item)).filter(Boolean)
    : normalizeString(source.options)
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  return {
    name: normalizeString(source.name),
    options,
    priceAdjustment: parseNumberLike(source.priceAdjustment) ?? 0,
    sku: normalizeOptionalString(source.sku) ?? undefined,
  };
}

export function createDefaultProductMetadata(): ProductMetadata {
  return {
    condition: "new",
    source: "manual",
    isPhysical: true,
    minOrderQuantity: 1,
    maxOrderQuantity: null,
    returnable: true,
    returnWindowDays: 7,
    warrantyText: null,
    expiryDate: null,
    handlingTimeDays: 1,
    shippingClass: null,
    packageWeight: null,
    packageWeightUnit: "kg",
    packageLength: null,
    packageWidth: null,
    packageHeight: null,
    packageDimensionsUnit: "cm",
    taxEnabled: true,
    discountEnabled: true,
    variantGroups: [],
  };
}

export function normalizeProductMetadata(value: unknown): ProductMetadata {
  const source = isRecord(value) ? value : {};
  return {
    ...createDefaultProductMetadata(),
    condition: normalizeCondition(source.condition),
    source: productSourceOptions.some((option) => option.value === source.source)
      ? (source.source as ProductSource)
      : "manual",
    isPhysical: parseBooleanLike(source.isPhysical, true),
    minOrderQuantity: Math.max(1, Math.trunc(parseNumberLike(source.minOrderQuantity) ?? 1)),
    maxOrderQuantity: normalizeOptionalInteger(source.maxOrderQuantity),
    returnable: parseBooleanLike(source.returnable, true),
    returnWindowDays: normalizeOptionalInteger(source.returnWindowDays),
    warrantyText: normalizeOptionalString(source.warrantyText),
    expiryDate: normalizeOptionalString(source.expiryDate),
    handlingTimeDays: normalizeOptionalInteger(source.handlingTimeDays),
    shippingClass: normalizeOptionalString(source.shippingClass),
    packageWeight: normalizeOptionalNumber(source.packageWeight),
    packageWeightUnit: normalizeWeightUnit(source.packageWeightUnit),
    packageLength: normalizeOptionalNumber(source.packageLength),
    packageWidth: normalizeOptionalNumber(source.packageWidth),
    packageHeight: normalizeOptionalNumber(source.packageHeight),
    packageDimensionsUnit: normalizeDimensionUnit(source.packageDimensionsUnit),
    taxEnabled: parseBooleanLike(source.taxEnabled, true),
    discountEnabled: parseBooleanLike(source.discountEnabled, true),
    variantGroups: Array.isArray(source.variantGroups)
      ? source.variantGroups
          .map((item) => normalizeProductVariantGroup(item))
          .filter((item) => item.name || item.options.length || item.priceAdjustment || item.sku)
      : [],
  };
}
