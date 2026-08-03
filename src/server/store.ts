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

type Actor = Pick<SessionUser, "id" | "email"> | null | undefined;

const demoState = createSeedState();

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
  if (!process.env.DATABASE_URL) {
    return {
      id: "settings-default",
      createdAt: now(),
      updatedAt: now(),
      ...demoState.settings,
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
  if (!process.env.DATABASE_URL) {
    return demoState;
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
  if (!process.env.DATABASE_URL) {
    return demoState.categories as unknown as Category[];
  }
  const prisma = getPrisma();
  return prisma.category.findMany({ orderBy: { createdAt: "desc" } }) as unknown as Category[];
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
  if (!process.env.DATABASE_URL) {
    return demoState.brands as unknown as Brand[];
  }
  const prisma = getPrisma();
  return prisma.brand.findMany({ orderBy: { createdAt: "desc" } }) as unknown as Brand[];
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
  if (!process.env.DATABASE_URL) {
    return demoState.products as unknown as Product[];
  }
  const prisma = getPrisma();
  return prisma.product.findMany({ orderBy: [{ featured: "desc" }, { createdAt: "desc" }] }) as unknown as Product[];
}

export async function listProductImages(productId?: string) {
  if (!process.env.DATABASE_URL) {
    return demoState.productImages
      .filter((image) => (productId ? image.productId === productId : true)) as unknown as Array<{ id: string; productId: string; url: string; alt: string; sortOrder: number }>;
  }
  const prisma = getPrisma();
  return prisma.productImage.findMany({
    where: productId ? { productId } : undefined,
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
  }) as unknown as Array<{ id: string; productId: string; url: string; alt: string; sortOrder: number }>;
}

export async function getProductBySlug(slug: string) {
  if (!process.env.DATABASE_URL) {
    return (demoState.products.find((product) => product.slug === slug) ?? null) as unknown as Product | null;
  }
  const prisma = getPrisma();
  return prisma.product.findUnique({ where: { slug } }) as unknown as Product | null;
}

export async function getProduct(id: string) {
  if (!process.env.DATABASE_URL) {
    return (demoState.products.find((product) => product.id === id) ?? null) as unknown as Product | null;
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

export async function setProductStock(productId: string, change: number, reason: string, actor?: Actor, orderId?: string) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) return null;
    const nextStock = product.stock + change;
    if (nextStock < 0) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    const updated = await tx.product.update({
      where: { id: productId },
      data: { stock: nextStock },
    });
    await tx.inventoryLog.create({
      data: {
        productId,
        orderId: orderId ?? null,
        actorId: actor?.id ?? null,
        change,
        oldStock: product.stock,
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
      oldValue: asJson({ stock: product.stock }),
      newValue: asJson({ stock: nextStock, change, reason }),
    });
    return updated as unknown as Product;
  });
}

export async function listCoupons() {
  if (!isDatabaseConfigured()) {
    return demoState.coupons as unknown as Coupon[];
  }
  const prisma = getPrisma();
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }) as unknown as Coupon[];
}

export async function upsertCoupon(input: Partial<Coupon> & Pick<Coupon, "code" | "description" | "type" | "value">, actor?: Actor) {
  const prisma = getPrisma();
  const code = input.code.toUpperCase();
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

export async function deleteCoupon(id: string, actor?: Actor) {
  const prisma = getPrisma();
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.coupon.delete({ where: { id } });
  await recordAuditLog({
    actor,
    action: "delete",
    entity: "coupon",
    entityId: id,
    oldValue: asJson(existing),
    newValue: null,
  });
  return existing;
}

export async function listUsers() {
  if (!process.env.DATABASE_URL) {
    return demoState.users as unknown as Array<Pick<User, "id" | "name" | "email" | "role" | "phone" | "createdAt" | "updatedAt">>;
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
    return (demoState.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null) as unknown as User | null;
  }
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } }) as unknown as User | null;
}

export async function findUserById(id: string) {
  if (!isDatabaseConfigured()) {
    return (demoState.users.find((user) => user.id === id) ?? null) as unknown as User | null;
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
    demoState.users.push(record);
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
    const user = demoState.users.find((u) => u.id === userId);
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

export async function updateUser(
  userId: string,
  input: { name?: string; email?: string; phone?: string | null },
  actor?: Actor,
) {
  if (!isDatabaseConfigured()) {
    const userIndex = demoState.users.findIndex((user) => user.id === userId);
    if (userIndex === -1) return null;
    const updated = {
      ...demoState.users[userIndex],
      ...input,
      email: input.email?.toLowerCase() ?? demoState.users[userIndex].email,
      phone: input.phone ?? demoState.users[userIndex].phone,
      updatedAt: new Date().toISOString(),
    };
    demoState.users[userIndex] = updated;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _unused, ...userWithoutPassword } = updated;
    await recordAuditLog({
      actor,
      action: "update",
      entity: "user",
      entityId: userId,
      oldValue: asJson(demoState.users[userIndex]),
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

export async function getCartByKey(guestKey: string, ownerId?: string | null) {
  if (!isDatabaseConfigured()) {
    return (
      demoState.carts.find((cart) =>
        ownerId ? cart.guestKey === guestKey || cart.ownerId === ownerId : cart.guestKey === guestKey,
      ) ?? null
    ) as unknown as (Cart & { items: Array<CartItem & { product: Product }> }) | null;
  }
  const prisma = getPrisma();
  return prisma.cart.findFirst({
    where: ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey },
    include: { items: { include: { product: true } } },
  });
}

export async function getOrCreateCart(guestKey: string, ownerId?: string | null) {
  const cartWhere = ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey };
  if (!isDatabaseConfigured()) {
    const existing = demoState.carts.find((cart) =>
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
    demoState.carts.push(created);
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
    const cart = demoState.carts.find((c) =>
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
    const cart = demoState.carts.find((c) =>
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

export async function addToCart(guestKey: string, productId: string, quantity = 1, ownerId?: string | null, actor?: Actor) {
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
    });
    return record;
  });
}

export async function removeCartItem(guestKey: string, productId: string, ownerId?: string | null, actor?: Actor) {
  if (!isDatabaseConfigured()) {
    const cart = demoState.carts.find((c) =>
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
    const cart = demoState.carts.find((c) =>
      ownerId ? c.guestKey === guestKey || c.ownerId === ownerId : c.guestKey === guestKey,
    );
    if (!cart) return null;
    const existing = cart.items.find((item) => item.productId === productId);
    if (!existing) return null;
    existing.quantity = Math.max(1, quantity);
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
    data: { quantity: Math.max(1, quantity) },
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
  return {
    items,
    subtotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    formattedSubtotal: money(subtotal),
    couponCode: source.couponCode ?? null,
  };
}

export async function listOrders() {
  if (!isDatabaseConfigured()) {
    return demoState.orders as unknown as Order[];
  }
  const prisma = getPrisma();
  return prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } }) as unknown as Order[];
}

export async function getOrderByCode(orderCode: string) {
  if (!isDatabaseConfigured()) {
    return (demoState.orders.find((order) => order.orderCode === orderCode) ?? null) as unknown as Order | null;
  }
  const prisma = getPrisma();
  return prisma.order.findUnique({ where: { orderCode }, include: { items: true } }) as unknown as Order | null;
}

export async function getOrder(orderId: string) {
  if (!isDatabaseConfigured()) {
    const order = demoState.orders.find((item) => item.id === orderId);
    if (!order) return null;
    return {
      ...order,
      statusHistory: demoState.orderStatusHistory.filter((history) => history.orderId === orderId),
    } as unknown as Order & { statusHistory: OrderStatusHistory[] };
  }
  const prisma = getPrisma();
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, statusHistory: { orderBy: { createdAt: "desc" } } },
  }) as unknown as (Order & { statusHistory: OrderStatusHistory[] }) | null;
}

export function deriveDeliveryZone(district: string): DeliveryZone {
  const normalized = district.trim().toLowerCase();
  if (normalized.includes("dhaka city") || normalized === "dhaka") return "inside_dhaka";
  if (normalized.includes("dhaka")) return "sub_dhaka";
  return "outside_dhaka";
}

export function getDeliveryChargeForZone(settings: Settings, zone: DeliveryZone, subtotalAfterDiscount = 0) {
  if (subtotalAfterDiscount >= settings.freeDeliveryThreshold) return 0;
  if (zone === "inside_dhaka") return settings.insideDhakaDeliveryCharge;
  if (zone === "sub_dhaka") return settings.subDhakaDeliveryCharge;
  return settings.outsideDhakaDeliveryCharge;
}

function assertPaymentMethodAvailable(settings: Settings, provider: PaymentProviderKey, zone: DeliveryZone) {
  if (provider === "cod") {
    const zoneCodEnabled =
      zone === "inside_dhaka"
        ? settings.insideDhakaCodEnabled
        : zone === "sub_dhaka"
          ? settings.subDhakaCodEnabled
          : settings.outsideDhakaCodEnabled;
    if (!settings.codEnabled || !zoneCodEnabled) throw new Error("COD is not enabled for this delivery zone");
    return;
  }
  if (provider === "bkash" && !settings.bkashEnabled) throw new Error("bKash is disabled");
  if (provider !== "bkash") throw new Error("Unsupported payment provider");
}

async function reserveOrderInventory(tx: Prisma.TransactionClient, orderId: string, actor?: Actor) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
  if (!order || order.inventoryReservedAt) return order;
  for (const item of order.items) {
    if (!item.product || item.product.archivedAt || !item.product.isActive) {
      throw new Error(`Product ${item.productId} is unavailable`);
    }
    if (item.product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${item.product.name}`);
    }
  }
  for (const item of order.items) {
    const nextStock = item.product.stock - item.quantity;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: nextStock },
    });
    await tx.inventoryLog.create({
      data: {
        productId: item.productId,
        orderId: order.id,
        actorId: actor?.id ?? null,
        change: -item.quantity,
        oldStock: item.product.stock,
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
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) continue;
    const nextStock = product.stock + item.quantity;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: nextStock },
    });
    await tx.inventoryLog.create({
      data: {
        productId: item.productId,
        orderId: order.id,
        actorId: actor?.id ?? null,
        change: item.quantity,
        oldStock: product.stock,
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
      throw new Error("Your cart is empty");
    }

    const settings = (await tx.setting.findFirst()) as unknown as Settings | null;
    if (!settings) throw new Error("Store settings are missing");
    const deliveryZone = input.deliveryZone ?? deriveDeliveryZone(input.district);
    const paymentProvider = input.paymentProvider ?? "cod";
    assertPaymentMethodAvailable(settings, paymentProvider, deliveryZone);

    const couponCode = (input.couponCode ?? cart.couponCode ?? undefined)?.toUpperCase();
    const coupon = couponCode ? await tx.coupon.findUnique({ where: { code: couponCode } }) : null;

    let subtotal = 0;
    for (const item of cart.items) {
      if (!item.product || item.product.archivedAt || !item.product.isActive) {
        throw new Error(`Product ${item.productId} is unavailable`);
      }
      if (item.product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.name}`);
      }
      subtotal += item.product.price * item.quantity;
    }

    const discountAmount =
      coupon && subtotal >= coupon.minOrderAmount
        ? coupon.type === "percentage"
          ? Math.round((subtotal * coupon.value) / 100)
          : coupon.value
        : 0;

    const deliveryCharge = getDeliveryChargeForZone(settings, deliveryZone, subtotal - discountAmount);
    const total = subtotal - discountAmount + deliveryCharge;
    const createdAt = now();
    const orderCode = buildOrderCode();

    const order = await tx.order.create({
      data: {
        orderCode,
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
      const nextStock = product.stock - item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: nextStock },
      });
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          orderId: order.id,
          actorId: actor?.id ?? null,
          change: -item.quantity,
          oldStock: product.stock,
          newStock: nextStock,
          reason: "order reservation",
          referenceType: "order",
          referenceId: order.id,
        },
      });
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
    });

    return record as unknown as Order;
  });
}

export async function listOrderStatusHistory(orderId?: string) {
  if (!process.env.DATABASE_URL) {
    return demoState.orderStatusHistory.filter((history) => (orderId ? history.orderId === orderId : true)) as unknown as OrderStatusHistory[];
  }
  const prisma = getPrisma();
  return prisma.orderStatusHistory.findMany({
    where: orderId ? { orderId } : undefined,
    orderBy: { createdAt: "desc" },
  }) as unknown as OrderStatusHistory[];
}

export async function updateOrderPayment(
  orderId: string,
  patch: { paymentStatus?: Payment["status"]; paymentProvider?: Payment["provider"] },
  actor?: Actor,
) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: orderId } });
    if (!existing) return null;

    const record = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: patch.paymentStatus ?? existing.paymentStatus,
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
    });

    return record as unknown as Order;
  });
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
    });
    return record as unknown as Order;
  });
}

export async function listPayments() {
  if (!process.env.DATABASE_URL) {
    return demoState.payments as unknown as Payment[];
  }
  const prisma = getPrisma();
  return prisma.payment.findMany({ orderBy: { createdAt: "desc" } }) as unknown as Payment[];
}

export async function getPaymentById(paymentId: string) {
  if (!process.env.DATABASE_URL) {
    return (demoState.payments.find((payment) => payment.id === paymentId) ?? null) as unknown as Payment | null;
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
) {
  const prisma = getPrisma();
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
  });

  return record as unknown as Payment;
}

export async function addPaymentLog(paymentId: string, stage: PaymentLog["stage"], payload: Record<string, unknown>) {
  const prisma = getPrisma();
  return prisma.paymentLog.create({
    data: {
      paymentId,
      stage,
      payload: asJson(payload) as Prisma.InputJsonValue,
    },
  });
}

export async function listLandingPages() {
  if (!process.env.DATABASE_URL) {
    return demoState.landingPages as unknown as LandingPage[];
  }
  const prisma = getPrisma();
  return prisma.landingPage.findMany({ orderBy: { createdAt: "desc" } }) as unknown as LandingPage[];
}

export async function getLandingPage(slug: string) {
  if (!process.env.DATABASE_URL) {
    return (demoState.landingPages.find((page) => page.slug === slug) ?? null) as unknown as LandingPage | null;
  }
  const prisma = getPrisma();
  return prisma.landingPage.findUnique({ where: { slug } }) as unknown as LandingPage | null;
}

export async function getLandingPageSections(landingPageId: string) {
  if (!process.env.DATABASE_URL) {
    return demoState.landingPageSections.filter((section) => section.landingPageId === landingPageId) as unknown as LandingPageSection[];
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

export async function listPaymentsForOrder(orderId: string) {
  if (!process.env.DATABASE_URL) {
    return demoState.payments.filter((payment) => payment.orderId === orderId) as unknown as Payment[];
  }
  const prisma = getPrisma();
  return prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } }) as unknown as Payment[];
}

export async function listAuditLogs() {
  if (!process.env.DATABASE_URL) {
    return demoState.auditLogs as unknown as DatabaseState["auditLogs"];
  }
  const prisma = getPrisma();
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listInventoryLogs() {
  if (!process.env.DATABASE_URL) {
    return demoState.inventoryLogs as unknown as InventoryLog[];
  }
  const prisma = getPrisma();
  return prisma.inventoryLog.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listAddresses(userId?: string | null, guestKey?: string | null) {
  if (!process.env.DATABASE_URL) {
    return demoState.addresses
      .filter((address) => {
        if (userId) return address.userId === userId;
        if (guestKey) return address.guestKey === guestKey;
        return false;
      })
      .sort((a, b) => (b.isDefault === a.isDefault ? 0 : b.isDefault ? -1 : 1)) as unknown as Address[];
  }
  const prisma = getPrisma();
  return prisma.address.findMany({
    where: userId ? { userId } : guestKey ? { guestKey } : {},
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  }) as unknown as Address[];
}

export async function getAddress(id: string) {
  if (!process.env.DATABASE_URL) {
    return (demoState.addresses.find((address) => address.id === id) ?? null) as unknown as Address | null;
  }
  const prisma = getPrisma();
  return prisma.address.findUnique({ where: { id } }) as unknown as Address | null;
}

export async function upsertAddress(
  input: Partial<Address> & Pick<Address, "name" | "phone" | "district" | "addressLine1" | "city" | "state" | "postalCode">,
  actor?: Actor,
) {
  const prisma = getPrisma();
  const existing = input.id ? await prisma.address.findUnique({ where: { id: input.id } }) : null;

  if (input.isDefault && (input.userId || input.guestKey)) {
    await prisma.address.updateMany({
      where: input.userId ? { userId: input.userId, isDefault: true } : { guestKey: input.guestKey!, isDefault: true },
      data: { isDefault: false },
    });
  }

  const record = existing
    ? await prisma.address.update({
        where: { id: existing.id },
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
          country: input.country ?? "Bangladesh",
          isDefault: input.isDefault ?? false,
        },
      })
    : await prisma.address.create({
        data: {
          userId: input.userId ?? null,
          guestKey: input.guestKey ?? null,
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          district: input.district,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 ?? null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country ?? "Bangladesh",
          isDefault: input.isDefault ?? false,
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "address",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
  });

  return record as unknown as Address;
}

export async function deleteAddress(id: string, actor?: Actor) {
  const prisma = getPrisma();
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.address.delete({ where: { id } });
  await recordAuditLog({
    actor,
    action: "delete",
    entity: "address",
    entityId: id,
    oldValue: asJson(existing),
    newValue: null,
  });
  return existing;
}

export async function setDefaultAddress(id: string, actor?: Actor) {
  const prisma = getPrisma();
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address) return null;

  await prisma.address.updateMany({
    where: address.userId ? { userId: address.userId, isDefault: true } : { guestKey: address.guestKey, isDefault: true },
    data: { isDefault: false },
  });

  const record = await prisma.address.update({
    where: { id },
    data: { isDefault: true },
  });

  await recordAuditLog({
    actor,
    action: "update",
    entity: "address",
    entityId: id,
    oldValue: asJson(address),
    newValue: asJson(record),
  });

  return record as unknown as Address;
}

