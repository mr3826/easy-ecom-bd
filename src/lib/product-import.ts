import type { ProductMetadata, ProductVariantGroup } from "@/lib/domain";
import {
  createDefaultProductMetadata,
  normalizeProductMetadata,
  normalizeProductVariantGroup,
  productConditionOptions,
  productDimensionUnitOptions,
  productWeightUnitOptions,
} from "@/lib/product-admin";

export const productUploadTemplateColumns = [
  { key: "name", label: "Product name", example: "Bornohin Signature Panjabi" },
  { key: "slug", label: "Slug", example: "bornohin-signature-panjabi" },
  { key: "sku", label: "SKU", example: "BOR-PA-001" },
  { key: "description", label: "Description", example: "Lightweight cotton panjabi with festive embroidery." },
  { key: "price", label: "Price", example: "1850" },
  { key: "compareAtPrice", label: "Compare at price", example: "2200" },
  { key: "stock", label: "Stock", example: "24" },
  { key: "lowStockThreshold", label: "Low stock threshold", example: "5" },
  { key: "category", label: "Category", example: "Men's Wear" },
  { key: "brand", label: "Brand", example: "Bornohin" },
  { key: "tags", label: "Tags", example: "festive; cotton; signature" },
  { key: "searchKeywords", label: "Search keywords", example: "panjabi; eid; premium" },
  { key: "featured", label: "Featured", example: "true" },
  { key: "isActive", label: "Active", example: "true" },
  { key: "weightGrams", label: "Weight grams", example: "400" },
  { key: "condition", label: "Condition", example: "new" },
  { key: "isPhysical", label: "Physical item", example: "true" },
  { key: "minOrderQuantity", label: "Minimum order quantity", example: "1" },
  { key: "maxOrderQuantity", label: "Maximum order quantity", example: "3" },
  { key: "returnable", label: "Returnable", example: "true" },
  { key: "returnWindowDays", label: "Return window days", example: "7" },
  { key: "warrantyText", label: "Warranty text", example: "7-day exchange for defects." },
  { key: "expiryDate", label: "Expiry date", example: "2026-12-31" },
  { key: "handlingTimeDays", label: "Handling time days", example: "2" },
  { key: "shippingClass", label: "Shipping class", example: "standard" },
  { key: "packageWeight", label: "Package weight", example: "0.4" },
  { key: "packageWeightUnit", label: "Package weight unit", example: "kg" },
  { key: "packageLength", label: "Package length", example: "32" },
  { key: "packageWidth", label: "Package width", example: "24" },
  { key: "packageHeight", label: "Package height", example: "6" },
  { key: "packageDimensionsUnit", label: "Package dimensions unit", example: "cm" },
  { key: "taxEnabled", label: "Tax enabled", example: "true" },
  { key: "discountEnabled", label: "Discount enabled", example: "true" },
  {
    key: "variantGroupsJson",
    label: "Variant groups JSON",
    example:
      '[{"name":"Color","options":["Black","Olive"],"priceAdjustment":0},{"name":"Size","options":["S","M","L"],"priceAdjustment":0}]',
  },
  { key: "imageUrls", label: "Image URLs", example: "/uploads/products/example-1.png|/uploads/products/example-2.png" },
] as const;

type ProductUploadColumnKey = (typeof productUploadTemplateColumns)[number]["key"];

export interface ProductUploadRecord {
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  lowStockThreshold: string;
  category: string;
  brand: string;
  tags: string;
  searchKeywords: string;
  featured: string;
  isActive: string;
  weightGrams: string;
  condition: string;
  isPhysical: string;
  minOrderQuantity: string;
  maxOrderQuantity: string;
  returnable: string;
  returnWindowDays: string;
  warrantyText: string;
  expiryDate: string;
  handlingTimeDays: string;
  shippingClass: string;
  packageWeight: string;
  packageWeightUnit: string;
  packageLength: string;
  packageWidth: string;
  packageHeight: string;
  packageDimensionsUnit: string;
  taxEnabled: string;
  discountEnabled: string;
  variantGroupsJson: string;
  imageUrls: string;
}

export interface ParsedProductUploadRow {
  lineNumber: number;
  record: ProductUploadRecord;
  metadata: ProductMetadata;
  tags: string[];
  searchKeywords: string[];
  compareAtPrice: number | null;
  weightGrams: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  minOrderQuantity: number;
  maxOrderQuantity: number | null;
  returnWindowDays: number | null;
  handlingTimeDays: number | null;
  packageWeight: number | null;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  imageUrls: string[];
  categoryRef: string;
  brandRef: string;
}

const canonicalColumnMap = new Map(
  productUploadTemplateColumns.map((column) => [normalizeHeaderKey(column.key), column.key] as const),
);

function normalizeHeaderKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function canonicalizeHeader(value: string) {
  return canonicalColumnMap.get(normalizeHeaderKey(value)) ?? value.trim();
}

function quoteCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function serializeCsvRows(rows: string[][]) {
  return rows.map((row) => row.map((cell) => quoteCsvCell(cell ?? "")).join(",")).join("\n");
}

export function buildProductUploadTemplateCsv() {
  return serializeCsvRows([
    productUploadTemplateColumns.map((column) => column.key),
    productUploadTemplateColumns.map((column) => column.example),
  ]);
}

export function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((current) => current.some((item) => item.trim().length > 0));
}

function parseBooleanCell(value: string, fallback: boolean) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return ["true", "1", "on", "yes"].includes(normalized);
}

function parseNumberCell(
  value: string,
  label: string,
  options: { required?: boolean; integer?: boolean; min?: number; max?: number; fallback?: number | null } = {},
) {
  const normalized = value.trim();
  if (!normalized) {
    if (options.required) {
      throw new Error(`${label} is required`);
    }
    return options.fallback ?? null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number`);
  }
  const normalizedNumber = options.integer ? Math.trunc(parsed) : parsed;
  if (options.min !== undefined && normalizedNumber < options.min) {
    throw new Error(`${label} must be at least ${options.min}`);
  }
  if (options.max !== undefined && normalizedNumber > options.max) {
    throw new Error(`${label} must be at most ${options.max}`);
  }
  return normalizedNumber;
}

function parseOptionalDateCell(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} must use YYYY-MM-DD format`);
  }
  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }
  return normalized;
}

function parseListCell(value: string) {
  return value
    .split(/[\n,|;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseVariantGroupsCell(value: string): ProductVariantGroup[] {
  const normalized = value.trim();
  if (!normalized) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error("Variant groups JSON must be valid");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Variant groups JSON must be an array");
  }
  return parsed
    .map((group, index) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        throw new Error(`Variant group ${index + 1} is invalid`);
      }
      const normalizedGroup = normalizeProductVariantGroup(group);
      if (!normalizedGroup.name) {
        throw new Error(`Variant group ${index + 1} needs a name`);
      }
      if (!normalizedGroup.options.length) {
        throw new Error(`Variant group ${index + 1} needs at least one option`);
      }
      return normalizedGroup;
    })
    .filter((group) => group.name || group.options.length || group.priceAdjustment || group.sku);
}

export function parseProductUploadCsv(text: string) {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new Error("Upload template must include a header row and at least one product row");
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => canonicalizeHeader(header));

  return dataRows.map((row, rowIndex) => {
    const record = headers.reduce<Record<string, string>>((acc, header, columnIndex) => {
      acc[header] = (row[columnIndex] ?? "").trim();
      return acc;
    }, {});

    return normalizeProductUploadRow(record, rowIndex + 2);
  });
}

export function normalizeProductUploadRow(record: Record<string, string>, lineNumber = 2): ParsedProductUploadRow {
  const categoryRef = record.category.trim();
  const brandRef = record.brand.trim();
  if (!categoryRef) {
    throw new Error(`Row ${lineNumber}: Category is required`);
  }
  if (!brandRef) {
    throw new Error(`Row ${lineNumber}: Brand is required`);
  }

  const compareAtPrice = parseNumberCell(record.compareAtPrice ?? "", "Compare at price", {
    integer: true,
    min: 0,
  });
  const price = parseNumberCell(record.price ?? "", "Price", { required: true, integer: true, min: 0 }) as number;
  const stock = parseNumberCell(record.stock ?? "", "Stock", { required: true, integer: true, min: 0 }) as number;
  const lowStockThreshold = (parseNumberCell(record.lowStockThreshold ?? "", "Low stock threshold", {
    integer: true,
    min: 0,
    fallback: 5,
  }) ?? 5) as number;
  const minOrderQuantity = (parseNumberCell(record.minOrderQuantity ?? "", "Minimum order quantity", {
    integer: true,
    min: 1,
    fallback: 1,
  }) ?? 1) as number;
  const maxOrderQuantity = parseNumberCell(record.maxOrderQuantity ?? "", "Maximum order quantity", {
    integer: true,
    min: 1,
  });
  if (maxOrderQuantity !== null && maxOrderQuantity < minOrderQuantity) {
    throw new Error(`Row ${lineNumber}: Maximum order quantity must be greater than or equal to minimum order quantity`);
  }

  const returnWindowDays = parseNumberCell(record.returnWindowDays ?? "", "Return window days", {
    integer: true,
    min: 0,
  });
  const handlingTimeDays = parseNumberCell(record.handlingTimeDays ?? "", "Handling time days", {
    integer: true,
    min: 0,
  });
  const packageWeight = parseNumberCell(record.packageWeight ?? "", "Package weight", {
    min: 0,
  });
  const packageLength = parseNumberCell(record.packageLength ?? "", "Package length", {
    min: 0,
  });
  const packageWidth = parseNumberCell(record.packageWidth ?? "", "Package width", {
    min: 0,
  });
  const packageHeight = parseNumberCell(record.packageHeight ?? "", "Package height", {
    min: 0,
  });
  const weightGrams = (parseNumberCell(record.weightGrams ?? "", "Weight grams", {
    integer: true,
    min: 0,
    fallback: 0,
  }) ?? 0) as number;

  const metadata = normalizeProductMetadata({
    ...createDefaultProductMetadata(),
    source: "bulk",
    condition: productConditionOptions.some((option) => option.value === record.condition)
      ? record.condition
      : "new",
    isPhysical: parseBooleanCell(record.isPhysical ?? "", true),
    minOrderQuantity,
    maxOrderQuantity,
    returnable: parseBooleanCell(record.returnable ?? "", true),
    returnWindowDays,
    warrantyText: record.warrantyText.trim() || null,
    expiryDate: parseOptionalDateCell(record.expiryDate ?? "", "Expiry date"),
    handlingTimeDays,
    shippingClass: record.shippingClass.trim() || null,
    packageWeight,
    packageWeightUnit: productWeightUnitOptions.some((option) => option.value === record.packageWeightUnit)
      ? record.packageWeightUnit
      : "kg",
    packageLength,
    packageWidth,
    packageHeight,
    packageDimensionsUnit: productDimensionUnitOptions.some((option) => option.value === record.packageDimensionsUnit)
      ? record.packageDimensionsUnit
      : "cm",
    taxEnabled: parseBooleanCell(record.taxEnabled ?? "", true),
    discountEnabled: parseBooleanCell(record.discountEnabled ?? "", true),
    variantGroups: parseVariantGroupsCell(record.variantGroupsJson ?? ""),
  });

  return {
    lineNumber,
    record: {
      name: record.name.trim(),
      slug: record.slug.trim(),
      sku: record.sku.trim(),
      description: record.description.trim(),
      price: String(price),
      compareAtPrice: String(compareAtPrice ?? ""),
      stock: String(stock),
      lowStockThreshold: String(lowStockThreshold),
      category: categoryRef,
      brand: brandRef,
      tags: record.tags.trim(),
      searchKeywords: record.searchKeywords.trim(),
      featured: record.featured.trim(),
      isActive: record.isActive.trim(),
      weightGrams: String(weightGrams),
      condition: record.condition.trim(),
      isPhysical: record.isPhysical.trim(),
      minOrderQuantity: String(minOrderQuantity),
      maxOrderQuantity: String(maxOrderQuantity ?? ""),
      returnable: record.returnable.trim(),
      returnWindowDays: String(returnWindowDays ?? ""),
      warrantyText: record.warrantyText.trim(),
      expiryDate: record.expiryDate.trim(),
      handlingTimeDays: String(handlingTimeDays ?? ""),
      shippingClass: record.shippingClass.trim(),
      packageWeight: String(packageWeight ?? ""),
      packageWeightUnit: record.packageWeightUnit.trim(),
      packageLength: String(packageLength ?? ""),
      packageWidth: String(packageWidth ?? ""),
      packageHeight: String(packageHeight ?? ""),
      packageDimensionsUnit: record.packageDimensionsUnit.trim(),
      taxEnabled: record.taxEnabled.trim(),
      discountEnabled: record.discountEnabled.trim(),
      variantGroupsJson: record.variantGroupsJson.trim(),
      imageUrls: record.imageUrls.trim(),
    },
    metadata,
    tags: parseListCell(record.tags ?? ""),
    searchKeywords: parseListCell(record.searchKeywords ?? "").map((item) => item.toLowerCase()),
    compareAtPrice: compareAtPrice === 0 ? null : compareAtPrice,
    weightGrams,
    price,
    stock,
    lowStockThreshold,
    minOrderQuantity,
    maxOrderQuantity,
    returnWindowDays,
    handlingTimeDays,
    packageWeight,
    packageLength,
    packageWidth,
    packageHeight,
    imageUrls: parseListCell(record.imageUrls ?? ""),
    categoryRef,
    brandRef,
  };
}
