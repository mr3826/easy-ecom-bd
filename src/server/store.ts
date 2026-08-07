import { randomBytes } from "crypto";
import type { Prisma, Product as PrismaProduct } from "@prisma/client";
import type {
  Address,
  Brand,
  Cart,
  CartItem,
  Category,
  Coupon,
  DatabaseState,
  InventoryLog,
  LandingPage,
  LandingPageSection,
  Order,
  OrderStatus,
  OrderStatusHistory,
  Payment,
  PaymentLog,
  PaymentProviderKey,
  Product,
  Settings,
  User,
  DeliveryStatus,
  DeliveryZone,
} from "@/lib/domain";
import { getPrisma, isDatabaseConfigured } from "@/server/db";
import { recordAuditLog } from "@/server/audit";
import type { SessionUser } from "@/server/auth";
import { money, slugify } from "@/lib/utils";
import { normalizeGtmContainerId, normalizeMetaPixelId } from "@/lib/analytics-ids";
import { createSeedState } from "@/server/seed";
import { siteBrand } from "@/lib/site-brand";
import { deleteStoredUploadFile } from "@/server/storage";
import { normalizeProductMetadata } from "@/lib/product-admin";
import { deriveDeliveryZone as deriveDeliveryZoneShared, getDeliveryChargeForZone as getDeliveryChargeForZoneShared } from "@/lib/delivery";

type Actor = Pick<SessionUser, "id" | "email"> | null | undefined;

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

let demoState: ReturnType<typeof createSeedState> | null = null;

function getDemoState() {
  if (!demoState) demoState = createSeedState();
  return demoState;
}

function now() {
  return new Date();
}

function asJson(value: unknown): Prisma.JsonValue {
  return value as Prisma.JsonValue;
}

function buildOrderCode() {
  return `EE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

type CartSummaryItem = {
  id: string;
  productId: string;
  quantity: number;
  product: PrismaProduct;
};

function cartToSummaryItems(items: Array<CartSummaryItem>) {
  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    product: item.product as unknown as Product,
    lineTotal: item.product.price * item.quantity,
  }));
}

async function getSettingsRow() {
  if (!isDatabaseConfigured()) {
    return {
      id: "settings-default",
      createdAt: now(),
      updatedAt: now(),
      ...getDemoState().settings,
      storeName: siteBrand.name,
      logoText: siteBrand.name,
      supportEmail: siteBrand.supportEmail,
    };
  }
  const prisma = getPrisma();
  const settings = await prisma.setting.findFirst();
  if (settings) return settings;
  return prisma.setting.create({
    data: {
      storeName: siteBrand.name,
      logoText: siteBrand.name,
      logoUrl: null,
      supportEmail: siteBrand.supportEmail,
      contactNumber: "01700 123 456",
      metaPixelId: null,
      gtmContainerId: null,
      deliveryCharge: 80,
      freeDeliveryThreshold: 1990,
      address: "Dhaka, Bangladesh",
      businessHours: "10:00 AM - 8:00 PM",
      deliveryAreas: ["Inside Dhaka", "Sub-Dhaka", "Outside Dhaka"],
      returnRefundPolicy: "Return requests are reviewed within 3 days of delivery.",
      confirmationMessageTemplate: "Thanks for your order. We will confirm it shortly.",
      codEnabled: true,
      bkashEnabled: false,
      bkashAccountNumber: null,
      bkashInstructions: "",
      insideDhakaDeliveryCharge: 80,
      subDhakaDeliveryCharge: 100,
      outsideDhakaDeliveryCharge: 130,
      insideDhakaCodEnabled: true,
      subDhakaCodEnabled: true,
      outsideDhakaCodEnabled: true,
    },
  });
}

export async function getState(): Promise<DatabaseState> {
  if (!isDatabaseConfigured()) {
    return getDemoState();
  }
  const prisma = getPrisma();
  const [
    users,
    categories,
    brands,
    products,
    productImages,
    carts,
    orders,
    orderStatusHistory,
    payments,
    paymentLogs,
    landingPages,
    landingPageSections,
    coupons,
    inventoryLogs,
    addresses,
    settings,
    auditLogs,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.brand.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ orderBy: [{ featured: "desc" }, { createdAt: "desc" }] }),
    prisma.productImage.findMany({ orderBy: [{ productId: "asc" }, { sortOrder: "asc" }] }),
    prisma.cart.findMany({ include: { items: true }, orderBy: { updatedAt: "desc" } }),
    prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } }),
    prisma.orderStatusHistory.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.paymentLog.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.landingPage.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.landingPageSection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.inventoryLog.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.address.findMany({ orderBy: { createdAt: "desc" } }),
    getSettingsRow(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return {
    users: users.map(({ passwordHash, ...user }) => {
      void passwordHash;
      return user;
    }) as unknown as User[],
    categories: categories as unknown as Category[],
    brands: brands as unknown as Brand[],
    products: products as unknown as Product[],
    productImages: productImages as unknown as Array<{ id: string; productId: string; url: string; alt: string; sortOrder: number }>,
    carts: carts.map((cart) => ({ ...cart, items: cart.items })) as unknown as Cart[],
    orders: orders as unknown as Order[],
    orderStatusHistory: orderStatusHistory as unknown as OrderStatusHistory[],
    payments: payments as unknown as Payment[],
    paymentLogs: paymentLogs as unknown as PaymentLog[],
    landingPages: landingPages as unknown as LandingPage[],
    landingPageSections: landingPageSections as unknown as LandingPageSection[],
    coupons: coupons as unknown as Coupon[],
    inventoryLogs: inventoryLogs as unknown as InventoryLog[],
    addresses: addresses as unknown as Array<{ id: string; userId: string | null; guestKey: string | null; name: string; phone: string; email: string | null; district: string; addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string; country: string; isDefault: boolean; createdAt: string; updatedAt: string }>,
    settings: settings as unknown as Settings,
    auditLogs: auditLogs as unknown as DatabaseState["auditLogs"],
  };
}

export async function listCategories() {
  if (!isDatabaseConfigured()) {
    return getDemoState().categories as unknown as Category[];
  }
  const prisma = getPrisma();
  return prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  }) as unknown as Category[];
}

export async function upsertCategory(
  input: Partial<Category> & Pick<Category, "name" | "description">,
  actor?: Actor,
) {
  const prisma = getPrisma();
  const existing = input.id ? await prisma.category.findUnique({ where: { id: input.id } }) : null;
  const record = existing
    ? await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          slug: input.slug ?? slugify(input.name),
          description: input.description,
          isActive: input.isActive ?? true,
        },
      })
    : await prisma.category.create({
        data: {
          name: input.name,
          slug: input.slug ?? slugify(input.name),
          description: input.description,
          isActive: input.isActive ?? true,
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "category",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
  });

  return record as unknown as Category;
}

export async function deleteCategory(id: string, actor?: Actor) {
  const prisma = getPrisma();
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return null;
  const record = await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });
  await recordAuditLog({
    actor,
    action: "delete",
    entity: "category",
    entityId: id,
    oldValue: asJson(existing),
    newValue: asJson(record),
  });
  return record;
}

export async function listBrands() {
  if (!isDatabaseConfigured()) {
    return getDemoState().brands as unknown as Brand[];
  }
  const prisma = getPrisma();
  return prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
  }) as unknown as Brand[];
}

export async function upsertBrand(input: Partial<Brand> & Pick<Brand, "name" | "description">, actor?: Actor) {
  const prisma = getPrisma();
  const existing = input.id ? await prisma.brand.findUnique({ where: { id: input.id } }) : null;
  const logoUrl = input.logoUrl ?? existing?.logoUrl ?? null;
  const record = existing
    ? await prisma.brand.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          slug: input.slug ?? slugify(input.name),
          description: input.description,
          logoUrl,
          isActive: input.isActive ?? true,
        },
      })
    : await prisma.brand.create({
        data: {
          name: input.name,
          slug: input.slug ?? slugify(input.name),
          description: input.description,
          logoUrl,
          isActive: input.isActive ?? true,
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "brand",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
  });

  return record as unknown as Brand;
}

export async function deleteBrand(id: string, actor?: Actor) {
  const prisma = getPrisma();
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) return null;
  const record = await prisma.brand.update({
    where: { id },
    data: { isActive: false },
  });
  await recordAuditLog({
    actor,
    action: "delete",
    entity: "brand",
    entityId: id,
    oldValue: asJson(existing),
    newValue: asJson(record),
  });
  return record;
}

export async function listProducts() {
  if (!isDatabaseConfigured()) {
    return getDemoState().products as unknown as Product[];
  }
  const prisma = getPrisma();
  return prisma.product.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  }) as unknown as Product[];
}

export async function listProductImages(productId?: string) {
  if (!isDatabaseConfigured()) {
    return getDemoState().productImages
      .filter((image) => (productId ? image.productId === productId : true)) as unknown as Array<{ id: string; productId: string; url: string; alt: string; sortOrder: number }>;
  }
  const prisma = getPrisma();
  return prisma.productImage.findMany({
    where: productId ? { productId } : undefined,
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
  }) as unknown as Array<{ id: string; productId: string; url: string; alt: string; sortOrder: number }>;
}

async function getProductBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    return (getDemoState().products.find((product) => product.slug === slug) ?? null) as unknown as Product | null;
  }
  const prisma = getPrisma();
  return prisma.product.findUnique({ where: { slug } }) as unknown as Product | null;
}

export async function getProduct(id: string) {
  if (!isDatabaseConfigured()) {
    return (getDemoState().products.find((product) => product.id === id) ?? null) as unknown as Product | null;
  }
  const prisma = getPrisma();
  return prisma.product.findUnique({ where: { id } }) as unknown as Product | null;
}

function buildProductSearchKeywords(input: {
  name: string;
  sku?: string;
  description?: string;
  tags?: string[];
  metadata?: Product["metadata"] | null;
}) {
  const metadataTerms = input.metadata
    ? [
        input.metadata.source,
        input.metadata.condition,
        input.metadata.shippingClass,
        input.metadata.warrantyText,
        ...(input.metadata.variantGroups ?? []).flatMap((group) => [group.name, ...group.options, group.sku ?? ""]),
      ]
    : [];
  const source = [input.name, input.sku, input.description, ...(input.tags ?? []), ...metadataTerms].join(" ");
  return Array.from(
    new Set(
      source
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2),
    ),
  );
}

export async function upsertProduct(
  input: Partial<Product> &
    Pick<Product, "name" | "description" | "price" | "categoryId"> & {
      metadata?: Product["metadata"] | null;
    },
  actor?: Actor,
) {
  const prisma = getPrisma();
  if (!input.name.trim()) throw new Error("Product name is required");
  if (!input.description.trim()) throw new Error("Product description is required");
  if (input.price < 0) throw new Error("Product price cannot be negative");
  if ((input.compareAtPrice ?? 0) < 0) throw new Error("Sale/compare price cannot be negative");
  if ((input.stock ?? 0) < 0) throw new Error("Stock cannot be negative");
  if ((input.lowStockThreshold ?? 0) < 0) throw new Error("Low-stock threshold cannot be negative");

  const existing = input.id ? await prisma.product.findUnique({ where: { id: input.id } }) : null;
  const sku = input.sku ?? existing?.sku ?? `${slugify(input.name).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const tags = input.tags ?? [];
  const existingMetadata = normalizeProductMetadata(existing?.metadata ?? null);
  const metadata = normalizeProductMetadata({
    ...existingMetadata,
    ...(input.metadata ?? {}),
  });
  const metadataJson = JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;
  const searchKeywords = input.searchKeywords?.length
    ? input.searchKeywords
    : buildProductSearchKeywords({
        name: input.name,
        sku,
        description: input.description,
        tags,
        metadata,
      });
  const record = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          slug: input.slug ?? slugify(input.name),
          sku,
          description: input.description,
          price: input.price,
          compareAtPrice: input.compareAtPrice ?? null,
          stock: input.stock ?? existing.stock,
          lowStockThreshold: input.lowStockThreshold ?? existing.lowStockThreshold,
          categoryId: input.categoryId,
          // An explicit null clears the brand; omitting the key leaves it alone,
          // so a partial update cannot wipe it by accident.
          brandId: input.brandId !== undefined ? input.brandId : existing.brandId,
          isActive: input.isActive ?? true,
          featured: input.featured ?? false,
          archivedAt: input.archivedAt ?? existing.archivedAt ?? null,
          weightGrams: input.weightGrams ?? 0,
          tags,
          searchKeywords,
          metadata: metadataJson,
        },
      })
    : await prisma.product.create({
        data: {
          name: input.name,
          slug: input.slug ?? slugify(input.name),
          sku,
          description: input.description,
          price: input.price,
          compareAtPrice: input.compareAtPrice ?? null,
          stock: input.stock ?? 0,
          lowStockThreshold: input.lowStockThreshold ?? 5,
          categoryId: input.categoryId,
          brandId: input.brandId ?? null,
          isActive: input.isActive ?? true,
          featured: input.featured ?? false,
          archivedAt: input.archivedAt ?? null,
          weightGrams: input.weightGrams ?? 0,
          tags,
          searchKeywords,
          metadata: metadataJson,
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "product",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
  });

  return record as unknown as Product;
}

async function isUploadReferencedElsewhere(tx: Prisma.TransactionClient, url: string, productId: string) {
  const [otherProductImage, brand, setting, landingPage, landingPageSection] = await Promise.all([
    tx.productImage.findFirst({ where: { url, productId: { not: productId } }, select: { id: true } }),
    tx.brand.findFirst({ where: { logoUrl: url }, select: { id: true } }),
    tx.setting.findFirst({ where: { logoUrl: url }, select: { id: true } }),
    tx.landingPage.findFirst({ where: { bannerImageUrl: url }, select: { id: true } }),
    tx.landingPageSection.findFirst({ where: { imageUrl: url }, select: { id: true } }),
  ]);
  return Boolean(otherProductImage || brand || setting || landingPage || landingPageSection);
}

export async function replaceProductImages(productId: string, imageUrls: string[], alt: string) {
  const prisma = getPrisma();
  const normalizedUrls = Array.from(new Set(imageUrls.map((url) => url.trim()).filter(Boolean)));

  const removableUploadUrls = await prisma.$transaction(async (tx) => {
    const existingImages = await tx.productImage.findMany({ where: { productId } });
    const removedUrls = existingImages
      .map((image) => image.url)
      .filter((url) => !normalizedUrls.includes(url));

    await tx.productImage.deleteMany({ where: { productId } });
    if (normalizedUrls.length) {
      await tx.productImage.createMany({
        data: normalizedUrls.map((url, index) => ({
          productId,
          url,
          alt,
          sortOrder: index,
        })),
      });
    }

    const removable: string[] = [];
    for (const url of removedUrls) {
      if (url.startsWith("/uploads/") && !(await isUploadReferencedElsewhere(tx, url, productId))) {
        removable.push(url);
      }
    }
    return removable;
  });

  await Promise.all(removableUploadUrls.map((url) => deleteStoredUploadFile(url)));

  return prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
  }) as unknown as Array<{ id: string; productId: string; url: string; alt: string; sortOrder: number }>;
}

export async function archiveProduct(id: string, actor?: Actor) {
  const prisma = getPrisma();
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return null;
  const record = await prisma.product.update({
    where: { id },
    data: { archivedAt: now(), isActive: false },
  });
  await recordAuditLog({
    actor,
    action: "archive",
    entity: "product",
    entityId: id,
    oldValue: asJson(existing),
    newValue: asJson(record),
  });
  return record;
}

export async function deleteProduct(id: string, actor?: Actor) {
  const prisma = getPrisma();
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.product.update({ where: { id }, data: { archivedAt: now(), isActive: false } });
  await recordAuditLog({
    actor,
    action: "delete",
    entity: "product",
    entityId: id,
    oldValue: asJson(existing),
    newValue: null,
  });
  return existing;
}

/**
 * Cart quantities arrive as raw FormData and reach a Prisma Int column and the
 * order subtotal. A negative or fractional value used to pass every guard: the
 * stock check `stock < quantity` is false for a negative quantity, and the
 * subtotal is `price * quantity`. Clamp once, here, rather than at each caller.
 */
function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.trunc(quantity));
}

/**
 * Stock moves must be one statement, not read-then-write.
 *
 * The previous shape read `product.stock`, compared it, then wrote the absolute
 * literal it had computed in JS. Prisma's interactive transactions run at
 * PostgreSQL's default READ COMMITTED and nothing took a row lock, so two
 * checkouts of the last unit both read 1, both passed the check, and both wrote
 * 0 — one sale silently lost, with two inventory_logs rows each claiming
 * oldStock 1 -> newStock 0.
 *
 * The conditional updateMany makes the check and the decrement a single
 * statement, so the row lock serialises the decision. `count !== 1` means
 * another transaction got there first.
 */
async function decrementStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
  productName: string,
) {
  const { count } = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (count !== 1) {
    throw new Error(`Insufficient stock for ${productName}`);
  }
  const after = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { stock: true },
  });
  return { oldStock: after.stock + quantity, newStock: after.stock };
}

/** Releases are unconditional — there is no upper bound to race against. */
async function incrementStock(tx: Prisma.TransactionClient, productId: string, quantity: number) {
  const after = await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
    select: { stock: true },
  });
  return { oldStock: after.stock - quantity, newStock: after.stock };
}

export async function setProductStock(productId: string, change: number, reason: string, actor?: Actor, orderId?: string) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
    if (!product) return null;
    const { oldStock, newStock: nextStock } =
      change < 0
        ? await decrementStock(tx, productId, -change, product.name)
        : await incrementStock(tx, productId, change);
    const updated = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    await tx.inventoryLog.create({
      data: {
        productId,
        orderId: orderId ?? null,
        actorId: actor?.id ?? null,
        change,
        oldStock,
        newStock: nextStock,
        reason,
        referenceType: orderId ? "order" : "manual",
        referenceId: orderId ?? null,
      },
    });
    await recordAuditLog({
      actor,
      action: "inventory_adjust",
      entity: "inventory",
      entityId: productId,
      oldValue: asJson({ stock: oldStock }),
      newValue: asJson({ stock: nextStock, change, reason }),
      client: tx,
    });
    return updated as unknown as Product;
  });
}

export async function listCoupons() {
  if (!isDatabaseConfigured()) {
    return getDemoState().coupons as unknown as Coupon[];
  }
  const prisma = getPrisma();
  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  }) as unknown as Coupon[];
}

export async function upsertCoupon(input: Partial<Coupon> & Pick<Coupon, "code" | "description" | "type" | "value">, actor?: Actor) {
  const prisma = getPrisma();
  const code = input.code.trim().toUpperCase();
  // The admin form reads these with asNumber and validates nothing, so a typo
  // (1000 instead of 10) used to reach checkout as a discount larger than the
  // cart. Checkout clamps too; this is so the admin sees the mistake.
  if (!code) throw new Error("Coupon code is required");
  if (!Number.isFinite(input.value) || input.value <= 0) {
    throw new Error("Coupon value must be greater than zero");
  }
  if (input.type === "percentage" && input.value > 100) {
    throw new Error("A percentage coupon cannot exceed 100");
  }
  if ((input.minOrderAmount ?? 0) < 0) {
    throw new Error("Minimum order amount cannot be negative");
  }
  const existing = input.id ? await prisma.coupon.findUnique({ where: { id: input.id } }) : await prisma.coupon.findUnique({ where: { code } });
  const record = existing
    ? await prisma.coupon.update({
        where: { id: existing.id },
        data: {
          code,
          description: input.description,
          type: input.type,
          value: input.value,
          minOrderAmount: input.minOrderAmount ?? 0,
          isActive: input.isActive ?? true,
        },
      })
    : await prisma.coupon.create({
        data: {
          code,
          description: input.description,
          type: input.type,
          value: input.value,
          minOrderAmount: input.minOrderAmount ?? 0,
          isActive: input.isActive ?? true,
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "coupon",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
  });

  return record as unknown as Coupon;
}

export async function listUsers() {
  if (!isDatabaseConfigured()) {
    return getDemoState().users as unknown as Array<Pick<User, "id" | "name" | "email" | "role" | "phone" | "createdAt" | "updatedAt">>;
  }
  const prisma = getPrisma();
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  }) as unknown as Array<Pick<User, "id" | "name" | "email" | "role" | "phone" | "createdAt" | "updatedAt">>;
}

export async function findUserByEmail(email: string) {
  if (!isDatabaseConfigured()) {
    return (getDemoState().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null) as unknown as User | null;
  }
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } }) as unknown as User | null;
}

export async function findUserById(id: string) {
  if (!isDatabaseConfigured()) {
    return (getDemoState().users.find((user) => user.id === id) ?? null) as unknown as User | null;
  }
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { id } }) as unknown as User | null;
}

export async function createUser(
  input: { name: string; email: string; passwordHash: string; role?: User["role"]; phone?: string | null },
  actor?: Actor,
) {
  if (!isDatabaseConfigured()) {
    const nowIso = new Date().toISOString();
    const record: User = {
      id: `user-${randomBytes(6).toString("hex")}`,
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role ?? "customer",
      phone: input.phone ?? undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    getDemoState().users.push(record);
    return record;
  }
  const prisma = getPrisma();
  const record = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role ?? "customer",
      phone: input.phone ?? null,
    },
  });
  await recordAuditLog({
    actor,
    action: "create",
    entity: "user",
    entityId: record.id,
    oldValue: null,
    newValue: asJson({ id: record.id, email: record.email, role: record.role }),
  });
  return record as unknown as User;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  if (!isDatabaseConfigured()) {
    const user = getDemoState().users.find((u) => u.id === userId);
    if (user) {
      user.passwordHash = passwordHash;
      user.updatedAt = new Date().toISOString();
    }
    return;
  }
  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function deleteManySessions(userId: string) {
  if (!isDatabaseConfigured()) {
    return;
  }
  const prisma = getPrisma();
  await prisma.session.deleteMany({ where: { userId } });
}

export async function deleteManyPasswordResetTokens(userId: string) {
  if (!isDatabaseConfigured()) {
    return;
  }
  const prisma = getPrisma();
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
}

export async function updateUser(
  userId: string,
  input: { name?: string; email?: string; phone?: string | null },
  actor?: Actor,
) {
  if (!isDatabaseConfigured()) {
    const userIndex = getDemoState().users.findIndex((user) => user.id === userId);
    if (userIndex === -1) return null;
    const updated = {
      ...getDemoState().users[userIndex],
      ...input,
      email: input.email?.toLowerCase() ?? getDemoState().users[userIndex].email,
      phone: input.phone ?? getDemoState().users[userIndex].phone,
      updatedAt: new Date().toISOString(),
    };
    getDemoState().users[userIndex] = updated;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _unused, ...userWithoutPassword } = updated;
    await recordAuditLog({
      actor,
      action: "update",
      entity: "user",
      entityId: userId,
      oldValue: asJson(getDemoState().users[userIndex]),
      newValue: asJson(userWithoutPassword),
    });
    return userWithoutPassword as unknown as User;
  }
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return null;
  const data: Partial<{ name: string; email: string; phone: string | null }> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email.toLowerCase();
  if (input.phone !== undefined) data.phone = input.phone;
  const record = await prisma.user.update({
    where: { id: userId },
    data,
  });
  await recordAuditLog({
    actor,
    action: "update",
    entity: "user",
    entityId: userId,
    oldValue: asJson(existing),
    newValue: asJson({ id: record.id, email: record.email, role: record.role }),
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _unused, ...userWithoutPassword } = record;
  return userWithoutPassword as unknown as User;
}

export async function listAddressesForUser(userId: string) {
  if (!isDatabaseConfigured()) {
    return getDemoState().addresses.filter((address) => address.userId === userId);
  }
  const prisma = getPrisma();
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  }) as unknown as Address[];
}

async function findAddressForUser(userId: string, addressId: string) {
  if (!isDatabaseConfigured()) {
    return getDemoState().addresses.find((address) => address.id === addressId && address.userId === userId) ?? null;
  }
  const prisma = getPrisma();
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  return address && address.userId === userId ? (address as unknown as Address) : null;
}

type AddressInput = {
  name: string;
  phone: string;
  email?: string | null;
  district: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
};

export async function createAddressForUser(userId: string, input: AddressInput, actor?: Actor) {
  if (!isDatabaseConfigured()) {
    const state = getDemoState();
    if (input.isDefault) {
      state.addresses.forEach((address) => {
        if (address.userId === userId) address.isDefault = false;
      });
    }
    const nowIso = new Date().toISOString();
    const record: Address = {
      id: `addr-${randomBytes(6).toString("hex")}`,
      userId,
      guestKey: null,
      country: "Bangladesh",
      ...input,
      isDefault: input.isDefault ?? state.addresses.every((address) => address.userId !== userId),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.addresses.push(record);
    return record;
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const existingCount = await tx.address.count({ where: { userId } });
    const record = await tx.address.create({
      data: {
        userId,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        district: input.district,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        isDefault: input.isDefault ?? existingCount === 0,
      },
    });
    await recordAuditLog({
      actor,
      action: "create",
      entity: "address",
      entityId: record.id,
      oldValue: null,
      newValue: asJson(record),
      client: tx,
    });
    return record as unknown as Address;
  });
}

export async function updateAddressForUser(
  userId: string,
  addressId: string,
  input: AddressInput,
  actor?: Actor,
) {
  const existing = await findAddressForUser(userId, addressId);
  if (!existing) return null;

  if (!isDatabaseConfigured()) {
    const state = getDemoState();
    if (input.isDefault) {
      state.addresses.forEach((address) => {
        if (address.userId === userId) address.isDefault = false;
      });
    }
    const index = state.addresses.findIndex((address) => address.id === addressId);
    const updated: Address = {
      ...state.addresses[index],
      ...input,
      isDefault: input.isDefault ?? state.addresses[index].isDefault,
      updatedAt: new Date().toISOString(),
    };
    state.addresses[index] = updated;
    return updated;
  }

  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const record = await tx.address.update({
      where: { id: addressId },
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        district: input.district,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        isDefault: input.isDefault ?? existing.isDefault,
      },
    });
    await recordAuditLog({
      actor,
      action: "update",
      entity: "address",
      entityId: addressId,
      oldValue: asJson(existing),
      newValue: asJson(record),
      client: tx,
    });
    return record as unknown as Address;
  });
}

export async function deleteAddressForUser(userId: string, addressId: string, actor?: Actor) {
  const existing = await findAddressForUser(userId, addressId);
  if (!existing) return false;

  if (!isDatabaseConfigured()) {
    const state = getDemoState();
    state.addresses = state.addresses.filter((address) => address.id !== addressId);
    if (existing.isDefault) {
      const next = state.addresses.find((address) => address.userId === userId);
      if (next) next.isDefault = true;
    }
    return true;
  }

  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });
    await recordAuditLog({
      actor,
      action: "delete",
      entity: "address",
      entityId: addressId,
      oldValue: asJson(existing),
      newValue: null,
      client: tx,
    });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });
  return true;
}

export async function setDefaultAddressForUser(userId: string, addressId: string, actor?: Actor) {
  const existing = await findAddressForUser(userId, addressId);
  if (!existing) return null;

  if (!isDatabaseConfigured()) {
    const state = getDemoState();
    state.addresses.forEach((address) => {
      if (address.userId === userId) address.isDefault = address.id === addressId;
    });
    return existing;
  }

  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    const record = await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    await recordAuditLog({
      actor,
      action: "update",
      entity: "address",
      entityId: addressId,
      oldValue: asJson(existing),
      newValue: asJson(record),
      client: tx,
    });
    return record as unknown as Address;
  });
}

export async function getSettings() {
  return (await getSettingsRow()) as unknown as Settings;
}

function validateSettings(settings: Settings) {
  const requiredText: Array<[string, string]> = [
    ["Store name", settings.storeName],
    ["Logo text", settings.logoText],
    ["Contact number", settings.contactNumber],
    ["Shop address", settings.address],
    ["Business hours", settings.businessHours],
    ["Return/refund policy", settings.returnRefundPolicy],
    ["Order confirmation message", settings.confirmationMessageTemplate],
  ];
  for (const [label, value] of requiredText) {
    if (!value.trim()) throw new Error(`${label} is required`);
  }

  if (!settings.deliveryAreas.length || settings.deliveryAreas.some((area) => !area.trim())) {
    throw new Error("At least one valid delivery area is required");
  }

  const nonNegativeIntegers: Array<[string, number]> = [
    ["Default delivery charge", settings.deliveryCharge],
    ["Free delivery threshold", settings.freeDeliveryThreshold],
    ["Inside Dhaka delivery charge", settings.insideDhakaDeliveryCharge],
    ["Sub-Dhaka delivery charge", settings.subDhakaDeliveryCharge],
    ["Outside Dhaka delivery charge", settings.outsideDhakaDeliveryCharge],
  ];
  for (const [label, value] of nonNegativeIntegers) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${label} must be a non-negative integer`);
    }
  }

  if (settings.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail)) {
    throw new Error("Support email must be valid");
  }

  if (settings.logoUrl) {
    const isLocalPath = settings.logoUrl.startsWith("/");
    let isHttpUrl = false;
    try {
      const parsed = new URL(settings.logoUrl);
      isHttpUrl = parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      isHttpUrl = false;
    }
    if (!isLocalPath && !isHttpUrl) {
      throw new Error("Logo URL must be an absolute HTTP(S) URL or a local path");
    }
  }

  const normalizedMetaPixelId = settings.metaPixelId ? normalizeMetaPixelId(settings.metaPixelId) : null;
  if (settings.metaPixelId && !normalizedMetaPixelId) {
    throw new Error("Meta Pixel ID must be numeric");
  }

  const normalizedGtmContainerId = settings.gtmContainerId ? normalizeGtmContainerId(settings.gtmContainerId) : null;
  if (settings.gtmContainerId && !normalizedGtmContainerId) {
    throw new Error("GTM container ID must use the GTM-XXXXXXX format");
  }

  const mobilePayments: Array<[string, boolean, string | null | undefined, string]> = [
    ["bKash", settings.bkashEnabled, settings.bkashAccountNumber, settings.bkashInstructions],
  ];
  for (const [name, enabled, accountNumber, instructions] of mobilePayments) {
    if (enabled && !accountNumber?.trim()) throw new Error(`${name} account number is required when enabled`);
    if (enabled && !instructions.trim()) throw new Error(`${name} instructions are required when enabled`);
  }

  if (
    settings.codEnabled &&
    !settings.insideDhakaCodEnabled &&
    !settings.subDhakaCodEnabled &&
    !settings.outsideDhakaCodEnabled
  ) {
    throw new Error("Enable COD for at least one delivery zone or disable COD");
  }
}

export async function updateSettings(patch: Partial<Settings>, actor?: Actor) {
  const prisma = getPrisma();
  const existing = await getSettingsRow();
  const definedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<Settings>;
  const next = {
    ...existing,
    ...definedPatch,
  } as unknown as Settings;
  validateSettings(next);

  const record = await prisma.setting.update({
    where: { id: existing.id },
    data: {
      storeName: next.storeName,
      logoText: next.logoText,
      logoUrl: next.logoUrl,
      supportEmail: next.supportEmail,
      contactNumber: next.contactNumber,
      address: next.address,
      businessHours: next.businessHours,
      deliveryAreas: next.deliveryAreas,
      returnRefundPolicy: next.returnRefundPolicy,
      confirmationMessageTemplate: next.confirmationMessageTemplate,
      metaPixelId: next.metaPixelId ? normalizeMetaPixelId(next.metaPixelId) : null,
      gtmContainerId: next.gtmContainerId ? normalizeGtmContainerId(next.gtmContainerId) : null,
      deliveryCharge: next.deliveryCharge,
      freeDeliveryThreshold: next.freeDeliveryThreshold,
      codEnabled: next.codEnabled,
      bkashEnabled: next.bkashEnabled,
      bkashAccountNumber: next.bkashAccountNumber,
      bkashInstructions: next.bkashInstructions,
      insideDhakaDeliveryCharge: next.insideDhakaDeliveryCharge,
      subDhakaDeliveryCharge: next.subDhakaDeliveryCharge,
      outsideDhakaDeliveryCharge: next.outsideDhakaDeliveryCharge,
      insideDhakaCodEnabled: next.insideDhakaCodEnabled,
      subDhakaCodEnabled: next.subDhakaCodEnabled,
      outsideDhakaCodEnabled: next.outsideDhakaCodEnabled,
    },
  });
  await recordAuditLog({
    actor,
    action: "update",
    entity: "settings",
    entityId: record.id,
    oldValue: asJson(existing),
    newValue: asJson(record),
  });
  return record as unknown as Settings;
}

export async function getOrCreateCart(guestKey: string, ownerId?: string | null) {
  const cartWhere = ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey };
  if (!isDatabaseConfigured()) {
    const existing = getDemoState().carts.find((cart) =>
      ownerId ? cart.guestKey === guestKey || cart.ownerId === ownerId : cart.guestKey === guestKey,
    );
    if (existing) return existing as unknown as Cart & { items: Array<CartItem & { product: Product }> };
    const created: Cart = {
      id: `cart-${randomBytes(4).toString("hex")}`,
      ownerId: ownerId ?? undefined,
      guestKey,
      couponCode: null,
      items: [],
      updatedAt: new Date().toISOString(),
    };
    getDemoState().carts.push(created);
    return created as unknown as Cart & { items: Array<CartItem & { product: Product }> };
  }
  const prisma = getPrisma();
  const existing = await prisma.cart.findFirst({
    where: cartWhere,
    include: { items: { include: { product: true } } },
  });
  if (existing) return existing as unknown as Cart & { items: Array<CartItem & { product: Product }> };
  try {
    const created = await prisma.cart.create({
      data: { guestKey, ownerId: ownerId ?? null },
      include: { items: { include: { product: true } } },
    });
    return created as unknown as Cart & { items: Array<CartItem & { product: Product }> };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      const retry = await prisma.cart.findFirst({
        where: cartWhere,
        include: { items: { include: { product: true } } },
      });
      if (retry) return retry as unknown as Cart & { items: Array<CartItem & { product: Product }> };
    }
    throw error;
  }
}

export async function clearCart(guestKey: string, ownerId?: string | null, actor?: Actor) {
  if (!isDatabaseConfigured()) {
    const cart = getDemoState().carts.find((c) =>
      ownerId ? c.guestKey === guestKey || c.ownerId === ownerId : c.guestKey === guestKey,
    );
    if (!cart) return null;
    cart.items = [];
    cart.couponCode = null;
    cart.updatedAt = new Date().toISOString();
    return cart as unknown as Cart & { items: Array<CartItem & { product: Product }> };
  }
  const prisma = getPrisma();
  const cart = await prisma.cart.findFirst({ where: ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey } });
  if (!cart) return null;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: null },
  });
  await recordAuditLog({
    actor,
    action: "delete",
    entity: "cart",
    entityId: cart.id,
    oldValue: asJson(cart),
    newValue: null,
  });
  return cart;
}

export async function setCartCoupon(guestKey: string, couponCode: string | null, ownerId?: string | null, actor?: Actor) {
  if (!isDatabaseConfigured()) {
    const cart = getDemoState().carts.find((c) =>
      ownerId ? c.guestKey === guestKey || c.ownerId === ownerId : c.guestKey === guestKey,
    );
    if (!cart) return null;
    cart.couponCode = couponCode;
    cart.updatedAt = new Date().toISOString();
    return cart as unknown as Cart & { items: Array<CartItem & { product: Product }> };
  }
  const prisma = getPrisma();
  const cart = await prisma.cart.findFirst({ where: ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey } });
  if (!cart) return null;
  const updated = await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode },
  });
  await recordAuditLog({
    actor,
    action: "update",
    entity: "cart",
    entityId: cart.id,
    oldValue: asJson(cart),
    newValue: asJson(updated),
  });
  return updated;
}

export async function addToCart(guestKey: string, productId: string, rawQuantity = 1, ownerId?: string | null, actor?: Actor) {
  const quantity = normalizeQuantity(rawQuantity);
  const product = (await getProduct(productId)) ?? (await getProductBySlug(productId));
  if (!product || product.archivedAt || !product.isActive) {
    throw new Error("Product is unavailable");
  }
  const resolvedProductId = product.id;
  const cart = await getOrCreateCart(guestKey, ownerId);
  if (!isDatabaseConfigured()) {
    const existing = cart.items.find((item) => item.productId === resolvedProductId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ id: `ci-${randomBytes(4).toString("hex")}`, productId: resolvedProductId, quantity });
    }
    cart.updatedAt = new Date().toISOString();
    return cart.items.find((item) => item.productId === resolvedProductId) as unknown as CartItem;
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart.id, productId: resolvedProductId },
    });
    const record = existing
      ? await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        })
      : await tx.cartItem.create({
          data: { cartId: cart.id, productId: resolvedProductId, quantity },
        });
    await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: now() } });
    await recordAuditLog({
      actor,
      action: existing ? "update" : "create",
      entity: "cart_item",
      entityId: record.id,
      oldValue: existing ? asJson(existing) : null,
      newValue: asJson(record),
      client: tx,
    });
    return record;
  });
}

export async function removeCartItem(guestKey: string, productId: string, ownerId?: string | null, actor?: Actor) {
  if (!isDatabaseConfigured()) {
    const cart = getDemoState().carts.find((c) =>
      ownerId ? c.guestKey === guestKey || c.ownerId === ownerId : c.guestKey === guestKey,
    );
    if (!cart) return null;
    const index = cart.items.findIndex((item) => item.productId === productId);
    if (index === -1) return null;
    const [removed] = cart.items.splice(index, 1);
    cart.updatedAt = new Date().toISOString();
    return removed as unknown as CartItem;
  }
  const prisma = getPrisma();
  const cart = await prisma.cart.findFirst({ where: ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey } });
  if (!cart) return null;
  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } });
  if (!existing) return null;
  await prisma.cartItem.delete({ where: { id: existing.id } });
  await recordAuditLog({
    actor,
    action: "delete",
    entity: "cart_item",
    entityId: existing.id,
    oldValue: asJson(existing),
    newValue: null,
  });
  return existing;
}

export async function updateCartQuantity(
  guestKey: string,
  productId: string,
  quantity: number,
  ownerId?: string | null,
  actor?: Actor,
) {
  if (!isDatabaseConfigured()) {
    const cart = getDemoState().carts.find((c) =>
      ownerId ? c.guestKey === guestKey || c.ownerId === ownerId : c.guestKey === guestKey,
    );
    if (!cart) return null;
    const existing = cart.items.find((item) => item.productId === productId);
    if (!existing) return null;
    existing.quantity = normalizeQuantity(quantity);
    cart.updatedAt = new Date().toISOString();
    return existing as unknown as CartItem;
  }
  const prisma = getPrisma();
  const cart = await prisma.cart.findFirst({ where: ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey } });
  if (!cart) return null;
  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } });
  if (!existing) return null;
  const record = await prisma.cartItem.update({
    where: { id: existing.id },
    data: { quantity: normalizeQuantity(quantity) },
  });
  await recordAuditLog({
    actor,
    action: "update",
    entity: "cart_item",
    entityId: record.id,
    oldValue: asJson(existing),
    newValue: asJson(record),
  });
  return record;
}

type CartSummarySource = {
  id: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product?: PrismaProduct | null;
  }>;
  couponCode?: string | null;
};

export function calculateCouponDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon || subtotal < coupon.minOrderAmount) return 0;
  const rawDiscount =
    coupon.type === "percentage"
      ? Math.round((subtotal * Math.min(100, Math.max(0, coupon.value))) / 100)
      : coupon.value;
  return Math.min(subtotal, Math.max(0, rawDiscount));
}

async function findActiveCoupon(code: string | null | undefined): Promise<Coupon | null> {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  if (!isDatabaseConfigured()) {
    return (getDemoState().coupons.find((coupon) => coupon.code === normalized && coupon.isActive) ?? null) as unknown as Coupon | null;
  }
  const prisma = getPrisma();
  return (await prisma.coupon.findFirst({ where: { code: normalized, isActive: true } })) as unknown as Coupon | null;
}

export async function getCartSummary(cart: { id: string; items: Array<CartItem & { product?: Product }>; couponCode?: string | null }) {
  let source: CartSummarySource;
  if (!isDatabaseConfigured()) {
    source = {
      ...cart,
      items: await Promise.all(
        cart.items.map(async (item) => ({
          ...item,
          product: ((await getProduct(item.productId)) as PrismaProduct | null) ?? null,
        })),
      ),
    };
  } else {
    const prisma = getPrisma();
    const freshCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });
    source = (freshCart ?? cart) as CartSummarySource;
  }
  const items = cartToSummaryItems(source.items.filter((item): item is CartSummaryItem => Boolean(item.product)));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const coupon = await findActiveCoupon(source.couponCode);
  const discountAmount = calculateCouponDiscount(subtotal, coupon);
  return {
    items,
    subtotal,
    discountAmount,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    formattedSubtotal: money(subtotal),
    couponCode: source.couponCode ?? null,
  };
}

export async function listOrders() {
  if (!isDatabaseConfigured()) {
    return getDemoState().orders as unknown as Order[];
  }
  const prisma = getPrisma();
  return prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } }) as unknown as Order[];
}

export async function getOrderByCode(orderCode: string) {
  if (!isDatabaseConfigured()) {
    return (getDemoState().orders.find((order) => order.orderCode === orderCode) ?? null) as unknown as Order | null;
  }
  const prisma = getPrisma();
  return prisma.order.findUnique({ where: { orderCode }, include: { items: true } }) as unknown as Order | null;
}

export async function getOrder(orderId: string) {
  if (!isDatabaseConfigured()) {
    const order = getDemoState().orders.find((item) => item.id === orderId);
    if (!order) return null;
    return {
      ...order,
      statusHistory: getDemoState().orderStatusHistory.filter((history) => history.orderId === orderId),
    } as unknown as Order & { statusHistory: OrderStatusHistory[] };
  }
  const prisma = getPrisma();
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, statusHistory: { orderBy: { createdAt: "desc" } } },
  }) as unknown as (Order & { statusHistory: OrderStatusHistory[] }) | null;
}

export function deriveDeliveryZone(district: string): DeliveryZone {
  return deriveDeliveryZoneShared(district);
}

export function getDeliveryChargeForZone(settings: Settings, zone: DeliveryZone, subtotalAfterDiscount = 0) {
  return getDeliveryChargeForZoneShared(settings, zone, subtotalAfterDiscount);
}

function assertPaymentMethodAvailable(settings: Settings, provider: PaymentProviderKey, zone: DeliveryZone) {
  if (provider === "cod") {
    const zoneCodEnabled =
      zone === "inside_dhaka"
        ? settings.insideDhakaCodEnabled
        : zone === "sub_dhaka"
          ? settings.subDhakaCodEnabled
          : settings.outsideDhakaCodEnabled;
    if (!settings.codEnabled || !zoneCodEnabled) throw new CheckoutError("COD is not enabled for this delivery zone");
    return;
  }
  if (provider === "bkash" && !settings.bkashEnabled) throw new CheckoutError("bKash is disabled");
  if (provider !== "bkash") throw new Error("Unsupported payment provider");
}

async function reserveOrderInventory(tx: Prisma.TransactionClient, orderId: string, actor?: Actor) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
  if (!order || order.inventoryReservedAt) return order;
  for (const item of order.items) {
    if (!item.product || item.product.archivedAt || !item.product.isActive) {
      throw new Error(`Product ${item.productId} is unavailable`);
    }
  }
  for (const item of order.items) {
    const { oldStock, newStock: nextStock } = await decrementStock(
      tx,
      item.productId,
      item.quantity,
      item.product!.name,
    );
    await tx.inventoryLog.create({
      data: {
        productId: item.productId,
        orderId: order.id,
        actorId: actor?.id ?? null,
        change: -item.quantity,
        oldStock,
        newStock: nextStock,
        reason: "order reservation",
        referenceType: "order",
        referenceId: order.id,
      },
    });
  }
  return tx.order.update({
    where: { id: orderId },
    data: { inventoryReservedAt: now() },
  });
}

async function releaseOrderInventory(tx: Prisma.TransactionClient, orderId: string, actor?: Actor) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.inventoryReleasedAt) return order;
  for (const item of order.items) {
    const product = await tx.product.findUnique({ where: { id: item.productId }, select: { id: true } });
    if (!product) continue;
    const { oldStock, newStock: nextStock } = await incrementStock(tx, item.productId, item.quantity);
    await tx.inventoryLog.create({
      data: {
        productId: item.productId,
        orderId: order.id,
        actorId: actor?.id ?? null,
        change: item.quantity,
        oldStock,
        newStock: nextStock,
        reason: "order release",
        referenceType: "order",
        referenceId: order.id,
      },
    });
  }
  return tx.order.update({
    where: { id: orderId },
    data: { inventoryReleasedAt: now() },
  });
}

export async function createOrderFromCart(
  input: {
    cart: { id: string; items: Array<CartItem & { product?: Product }>; couponCode?: string | null };
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    // H2. Order.customerId exists and is indexed, and /account reads it, but
    // nothing ever wrote it — so a signed-in customer's order linked to their
    // account only when the checkout email happened to match, and that field is
    // optional. Passed explicitly rather than taken from `actor`: an admin
    // creating an order on someone's behalf is the actor, never the customer.
    customerId?: string | null;
    district: string;
    shippingAddress: string;
    notes?: string;
    paymentProvider?: PaymentProviderKey;
    deliveryZone?: DeliveryZone;
    couponCode?: string;
  },
  actor?: Actor,
) {
  const prisma = getPrisma();
  // Every other read of the settings row goes through getSettingsRow(), which
  // creates it on a database that has never had one. Checking out was the one
  // path that skipped that and threw instead, so a freshly migrated or freshly
  // wiped database rejected orders until some unrelated page happened to render.
  await getSettingsRow();
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { id: input.cart.id },
      include: { items: { include: { product: true } } },
    });
    if (!cart || !cart.items.length) {
      throw new CheckoutError("Your cart is empty");
    }

    const settings = (await tx.setting.findFirst()) as unknown as Settings | null;
    if (!settings) throw new CheckoutError("Store settings are missing");
    const deliveryZone = input.deliveryZone ?? deriveDeliveryZone(input.district);
    const paymentProvider = input.paymentProvider ?? "cod";
    assertPaymentMethodAvailable(settings, paymentProvider, deliveryZone);

    const couponCode = (input.couponCode ?? cart.couponCode ?? undefined)?.toUpperCase();
    // findFirst, not findUnique: isActive is not part of the unique index, and a
    // coupon the admin has switched to Hidden must stop discounting. The admin
    // UI has always written this column; nothing used to read it.
    const coupon = couponCode
      ? await tx.coupon.findFirst({ where: { code: couponCode, isActive: true } })
      : null;

    let subtotal = 0;
    for (const item of cart.items) {
      if (!item.product || item.product.archivedAt || !item.product.isActive) {
        throw new CheckoutError(`Product ${item.productId} is unavailable`);
      }
      subtotal += item.product.price * normalizeQuantity(item.quantity);
    }

    const discountAmount = calculateCouponDiscount(subtotal, coupon as Coupon | null);

    const deliveryCharge = getDeliveryChargeForZone(settings, deliveryZone, subtotal - discountAmount);
    const total = subtotal - discountAmount + deliveryCharge;
    const createdAt = now();
    const orderCode = buildOrderCode();

    const order = await tx.order.create({
      data: {
        orderCode,
        customerId: input.customerId ?? null,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        district: input.district,
        shippingAddress: input.shippingAddress,
        deliveryCharge,
        discountAmount,
        couponCode: couponCode ?? null,
        subtotal,
        total,
        status: "pending",
        paymentStatus: "pending",
        deliveryStatus: "pending",
        paymentProvider,
        deliveryZone,
        notes: input.notes ?? null,
        inventoryReservedAt: createdAt,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.product!.price,
            lineTotal: item.product!.price * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: "pending",
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        note: "checkout order created",
      },
    });

    for (const item of cart.items) {
      const product = item.product!;
      try {
        const { oldStock, newStock: nextStock } = await decrementStock(
          tx,
          item.productId,
          normalizeQuantity(item.quantity),
          product.name,
        );
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            actorId: actor?.id ?? null,
            change: -item.quantity,
            oldStock,
            newStock: nextStock,
            reason: "order reservation",
            referenceType: "order",
            referenceId: order.id,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Insufficient stock for ")) {
          throw new CheckoutError(error.message);
        }
        throw error;
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({
      where: { id: cart.id },
      data: { couponCode: null, updatedAt: now() },
    });

    await recordAuditLog({
      actor,
      action: "create",
      entity: "order",
      entityId: order.id,
      oldValue: null,
      newValue: asJson({
        orderCode: order.orderCode,
        total: order.total,
        paymentProvider: order.paymentProvider,
      }),
      client: tx,
    });

    return order as unknown as Order;
  });
}

export async function createManualOrder(
  input: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    district: string;
    shippingAddress: string;
    items: Array<{ productId: string; quantity: number }>;
    status?: OrderStatus;
    paymentProvider?: PaymentProviderKey;
    paymentStatus?: Payment["status"];
    deliveryZone?: DeliveryZone;
    discountAmount?: number;
    notes?: string;
    adminNotes?: string;
  },
  actor?: Actor,
) {
  if (!input.customerName.trim()) throw new Error("Customer name is required");
  if (!input.customerPhone.trim()) throw new Error("Customer phone is required");
  if (!input.shippingAddress.trim()) throw new Error("Shipping address is required");
  if (!input.items.length) throw new Error("At least one order item is required");

  const prisma = getPrisma();
  // Same reason as checkout: manual order creation must not be the thing that
  // discovers the settings row was never written. See getSettingsRow().
  await getSettingsRow();
  return prisma.$transaction(async (tx) => {
    const settings = (await tx.setting.findFirst()) as unknown as Settings | null;
    if (!settings) throw new Error("Store settings are missing");

    const deliveryZone = input.deliveryZone ?? deriveDeliveryZone(input.district);
    const paymentProvider = input.paymentProvider ?? "cod";
    const orderStatus = input.status ?? "draft";
    assertPaymentMethodAvailable(settings, paymentProvider, deliveryZone);

    const productIds = input.items.map((item) => item.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productById = new Map(products.map((product) => [product.id, product]));
    let subtotal = 0;
    const normalizedItems = input.items.map((item) => {
      const product = productById.get(item.productId);
      if (!product || product.archivedAt || !product.isActive) {
        throw new Error(`Product ${item.productId} is unavailable`);
      }
      const quantity = Math.max(1, item.quantity);
      if (orderStatus !== "draft" && product.stock < quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      const lineTotal = product.price * quantity;
      subtotal += lineTotal;
      return { product, quantity, lineTotal };
    });

    const discountAmount = Math.max(0, input.discountAmount ?? 0);
    if (discountAmount > subtotal) throw new Error("Discount cannot exceed subtotal");
    const deliveryCharge = getDeliveryChargeForZone(settings, deliveryZone, subtotal - discountAmount);
    const total = subtotal - discountAmount + deliveryCharge;

    const order = await tx.order.create({
      data: {
        orderCode: buildOrderCode(),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        district: input.district,
        shippingAddress: input.shippingAddress,
        deliveryCharge,
        discountAmount,
        subtotal,
        total,
        status: orderStatus,
        paymentStatus: input.paymentStatus ?? "pending",
        deliveryStatus: "pending",
        paymentProvider,
        deliveryZone,
        notes: input.notes ?? null,
        adminNotes: input.adminNotes ?? null,
        items: {
          create: normalizedItems.map(({ product, quantity, lineTotal }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.price,
            lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: orderStatus,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        note: "manual order created",
      },
    });

    if (orderStatus !== "draft") {
      await reserveOrderInventory(tx, order.id, actor);
    }

    await recordAuditLog({
      actor,
      action: "create",
      entity: "manual_order",
      entityId: order.id,
      oldValue: null,
      newValue: asJson({ orderCode: order.orderCode, status: order.status, total: order.total }),
      client: tx,
    });

    return order as unknown as Order;
  });
}

const allowedOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending", "confirmed", "cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  cancelled: [],
  delivered: [],
};

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  actor?: Actor,
  note?: string | null,
) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!existing) return null;
    if (existing.status === nextStatus) return existing as unknown as Order;
    const allowed = allowedOrderTransitions[existing.status as OrderStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Cannot move order from ${existing.status} to ${nextStatus}`);
    }

    if (!existing.inventoryReservedAt && ["pending", "confirmed", "delivered"].includes(nextStatus)) {
      await reserveOrderInventory(tx, orderId, actor);
    }
    if (nextStatus === "cancelled") {
      await releaseOrderInventory(tx, orderId, actor);
    }

    const record = await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        deliveryStatus:
          nextStatus === "delivered" ? "delivered" : nextStatus === "cancelled" ? "cancelled" : existing.deliveryStatus,
      },
      include: { items: true },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: existing.status,
        toStatus: nextStatus,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        note: note ?? null,
      },
    });

    await recordAuditLog({
      actor,
      action: "update",
      entity: "order_status",
      entityId: orderId,
      oldValue: asJson(existing),
      newValue: asJson(record),
      client: tx,
    });

    return record as unknown as Order;
  });
}

export async function listOrderStatusHistory(orderId?: string) {
  if (!isDatabaseConfigured()) {
    return getDemoState().orderStatusHistory.filter((history) => (orderId ? history.orderId === orderId : true)) as unknown as OrderStatusHistory[];
  }
  const prisma = getPrisma();
  return prisma.orderStatusHistory.findMany({
    where: orderId ? { orderId } : undefined,
    orderBy: { createdAt: "desc" },
  }) as unknown as OrderStatusHistory[];
}

/*
H7. updateOrderStatus has guarded its transitions against allowedOrderTransitions
since it was written; payment status had no equivalent, so any value could be
written over any other and a settled order could silently move back to pending —
from the admin screen or from a replayed gateway callback.

Money only moves one way once it has landed: a paid order can be refunded and
nothing else. The remaining states are still working states, so they stay open
to each other; pinning them down harder would break the retry paths the gateway
depends on.
*/
const allowedPaymentTransitions: Record<Payment["status"], Array<Payment["status"]>> = {
  pending: ["pending", "processing", "paid", "failed", "cancelled"],
  processing: ["processing", "paid", "failed", "cancelled"],
  paid: ["paid", "refunded"],
  failed: ["failed", "pending", "processing", "paid", "cancelled"],
  cancelled: ["cancelled", "pending", "processing"],
  refunded: ["refunded"],
};

export class PaymentTransitionError extends Error {
  constructor(from: Payment["status"], to: Payment["status"]) {
    super(`Cannot move payment status from ${from} to ${to}`);
    this.name = "PaymentTransitionError";
  }
}

export async function updateOrderPayment(
  orderId: string,
  patch: { paymentStatus?: Payment["status"]; paymentProvider?: Payment["provider"] },
  actor?: Actor,
  // Supplied when the caller already owns a transaction — confirmPayment writes
  // the payment row, its log and this order update as one unit. Same pattern as
  // recordAuditLog's `client`: without it this opened a second connection and
  // committed independently of the writes it belongs with.
  client?: Prisma.TransactionClient,
) {
  const run = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.order.findUnique({ where: { id: orderId } });
    if (!existing) return null;

    const nextPaymentStatus = patch.paymentStatus ?? existing.paymentStatus;
    const currentPaymentStatus = existing.paymentStatus as Payment["status"];
    if (nextPaymentStatus !== currentPaymentStatus) {
      const allowed = allowedPaymentTransitions[currentPaymentStatus] ?? [];
      if (!allowed.includes(nextPaymentStatus as Payment["status"])) {
        throw new PaymentTransitionError(currentPaymentStatus, nextPaymentStatus as Payment["status"]);
      }
    }

    const record = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: nextPaymentStatus,
        paymentProvider: patch.paymentProvider ?? existing.paymentProvider,
      },
      include: { items: true },
    });

    const needsRelease = ["failed", "cancelled", "refunded"].includes(record.paymentStatus) && !record.inventoryReleasedAt;
    if (needsRelease) {
      await releaseOrderInventory(tx, orderId, actor);
    }

    await recordAuditLog({
      actor,
      action: "update",
      entity: "order_payment",
      entityId: orderId,
      oldValue: asJson(existing),
      newValue: asJson(record),
      client: tx,
    });

    return record as unknown as Order;
  };

  if (client) return run(client);
  return getPrisma().$transaction(run);
}

export async function updateOrderDelivery(orderId: string, deliveryStatus: DeliveryStatus, actor?: Actor) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!existing) return null;
    if (existing.deliveryStatus === deliveryStatus) {
      return existing as unknown as Order;
    }
    if (deliveryStatus === "cancelled") {
      await releaseOrderInventory(tx, orderId, actor);
    }
    const record = await tx.order.update({
      where: { id: orderId },
      data: { deliveryStatus },
      include: { items: true },
    });
    await recordAuditLog({
      actor,
      action: "update",
      entity: "order_delivery",
      entityId: orderId,
      oldValue: asJson(existing),
      newValue: asJson(record),
      client: tx,
    });
    return record as unknown as Order;
  });
}

export async function listPayments() {
  if (!isDatabaseConfigured()) {
    return getDemoState().payments as unknown as Payment[];
  }
  const prisma = getPrisma();
  return prisma.payment.findMany({ orderBy: { createdAt: "desc" } }) as unknown as Payment[];
}

export async function getPaymentById(paymentId: string) {
  if (!isDatabaseConfigured()) {
    return (getDemoState().payments.find((payment) => payment.id === paymentId) ?? null) as unknown as Payment | null;
  }
  const prisma = getPrisma();
  return prisma.payment.findUnique({ where: { id: paymentId } }) as unknown as Payment | null;
}

export async function getPaymentByTransactionId(transactionId: string) {
  const prisma = getPrisma();
  return prisma.payment.findFirst({ where: { transactionId } }) as unknown as Payment | null;
}

export async function upsertPayment(
  input: Omit<Payment, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string; updatedAt?: string },
  actor?: Actor,
  client?: Prisma.TransactionClient,
) {
  const prisma = client ?? getPrisma();
  const existing = input.id ? await prisma.payment.findUnique({ where: { id: input.id } }) : null;
  const record = existing
    ? await prisma.payment.update({
        where: { id: existing.id },
        data: {
          orderId: input.orderId,
          provider: input.provider,
          transactionId: input.transactionId,
          amount: input.amount,
          status: input.status,
          rawResponse: asJson(input.rawResponse) as Prisma.InputJsonValue,
        },
      })
    : await prisma.payment.create({
        data: {
          orderId: input.orderId,
          provider: input.provider,
          transactionId: input.transactionId,
          amount: input.amount,
          status: input.status,
          rawResponse: asJson(input.rawResponse) as Prisma.InputJsonValue,
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "payment",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
    client,
  });

  return record as unknown as Payment;
}

export async function addPaymentLog(
  paymentId: string,
  stage: PaymentLog["stage"],
  payload: Record<string, unknown>,
  client?: Prisma.TransactionClient,
) {
  const prisma = client ?? getPrisma();
  return prisma.paymentLog.create({
    data: {
      paymentId,
      stage,
      payload: asJson(payload) as Prisma.InputJsonValue,
    },
  });
}

export async function listLandingPages() {
  if (!isDatabaseConfigured()) {
    return getDemoState().landingPages as unknown as LandingPage[];
  }
  const prisma = getPrisma();
  return prisma.landingPage.findMany({ orderBy: { createdAt: "desc" } }) as unknown as LandingPage[];
}

export async function getLandingPage(slug: string) {
  if (!isDatabaseConfigured()) {
    return (getDemoState().landingPages.find((page) => page.slug === slug && page.published) ?? null) as unknown as LandingPage | null;
  }
  const prisma = getPrisma();
  return prisma.landingPage.findUnique({ where: { slug, published: true } }) as unknown as LandingPage | null;
}

export async function getLandingPageSections(landingPageId: string) {
  if (!isDatabaseConfigured()) {
    return getDemoState().landingPageSections.filter((section) => section.landingPageId === landingPageId) as unknown as LandingPageSection[];
  }
  const prisma = getPrisma();
  return prisma.landingPageSection.findMany({
    where: { landingPageId },
    orderBy: { sortOrder: "asc" },
  }) as unknown as LandingPageSection[];
}

export async function upsertLandingPage(
  input: Partial<LandingPage> & Pick<LandingPage, "slug" | "title" | "metaDescription" | "heroTitle" | "heroSubtitle">,
  actor?: Actor,
) {
  const prisma = getPrisma();
  const slug = slugify(input.slug);
  const existing = input.id ? await prisma.landingPage.findUnique({ where: { id: input.id } }) : await prisma.landingPage.findUnique({ where: { slug } });
  const record = existing
    ? await prisma.landingPage.update({
        where: { id: existing.id },
        data: {
          slug,
          title: input.title,
          metaDescription: input.metaDescription,
          heroTitle: input.heroTitle,
          heroSubtitle: input.heroSubtitle,
          bannerImageUrl: input.bannerImageUrl ?? null,
          published: input.published ?? false,
          publishedAt: input.published ? existing.publishedAt ?? now() : null,
          attachedProductIds: input.attachedProductIds ?? [],
        },
      })
    : await prisma.landingPage.create({
        data: {
          slug,
          title: input.title,
          metaDescription: input.metaDescription,
          heroTitle: input.heroTitle,
          heroSubtitle: input.heroSubtitle,
          bannerImageUrl: input.bannerImageUrl ?? null,
          published: input.published ?? false,
          publishedAt: input.published ? now() : null,
          attachedProductIds: input.attachedProductIds ?? [],
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "landing_page",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
  });

  return record as unknown as LandingPage;
}

export async function upsertLandingPageSection(
  input: Partial<LandingPageSection> & Pick<LandingPageSection, "landingPageId" | "type">,
  actor?: Actor,
) {
  const prisma = getPrisma();
  const existing = input.id ? await prisma.landingPageSection.findUnique({ where: { id: input.id } }) : null;
  const record = existing
    ? await prisma.landingPageSection.update({
        where: { id: existing.id },
        data: {
          landingPageId: input.landingPageId,
          type: input.type,
          title: input.title ?? null,
          subtitle: input.subtitle ?? null,
          body: input.body ?? null,
          imageUrl: input.imageUrl ?? null,
          productIds: input.productIds ?? [],
          items: (input.items ? asJson(input.items) : []) as Prisma.InputJsonValue,
          ctaLabel: input.ctaLabel ?? null,
          ctaHref: input.ctaHref ?? null,
          sortOrder: input.sortOrder ?? 0,
        },
      })
    : await prisma.landingPageSection.create({
        data: {
          landingPageId: input.landingPageId,
          type: input.type,
          title: input.title ?? null,
          subtitle: input.subtitle ?? null,
          body: input.body ?? null,
          imageUrl: input.imageUrl ?? null,
          productIds: input.productIds ?? [],
          items: (input.items ? asJson(input.items) : []) as Prisma.InputJsonValue,
          ctaLabel: input.ctaLabel ?? null,
          ctaHref: input.ctaHref ?? null,
          sortOrder: input.sortOrder ?? 0,
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "landing_page_section",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
  });

  return record as unknown as LandingPageSection;
}

export async function listAuditLogs() {
  if (!isDatabaseConfigured()) {
    return getDemoState().auditLogs as unknown as DatabaseState["auditLogs"];
  }
  const prisma = getPrisma();
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" } });
}





