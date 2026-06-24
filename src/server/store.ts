import { randomBytes } from "crypto";
import type { Prisma, Product as PrismaProduct, CartItem as PrismaCartItem } from "@prisma/client";
import type {
  Brand,
  Cart,
  CartItem,
  Category,
  Coupon,
  DatabaseState,
  DeliveryShipment,
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
  DeliveryZone,
} from "@/lib/domain";
import { getPrisma } from "@/server/db";
import { recordAuditLog } from "@/server/audit";
import type { SessionUser } from "@/server/auth";
import { money, slugify } from "@/lib/utils";

type Actor = Pick<SessionUser, "id" | "email"> | null | undefined;

function now() {
  return new Date();
}

function asJson(value: unknown): Prisma.JsonValue {
  return value as Prisma.JsonValue;
}

function buildOrderCode() {
  return `EE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function cartToSummaryItems(items: Array<PrismaCartItem & { product: PrismaProduct }>) {
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
      storeName: "Easy Ecom BD",
      logoText: "Easy Ecom",
      logoUrl: null,
      supportEmail: "support@example.com",
      contactNumber: "01700 123 456",
      address: "Dhaka, Bangladesh",
      businessHours: "10:00 AM - 8:00 PM",
      deliveryAreas: ["Inside Dhaka", "Sub-Dhaka", "Outside Dhaka"],
      returnRefundPolicy: "Return requests are reviewed within 3 days of delivery.",
      confirmationMessageTemplate: "Thanks for your order. We will confirm it shortly.",
      metaPixelId: null,
      gtmContainerId: null,
      deliveryCharge: 80,
      freeDeliveryThreshold: 1990,
      codEnabled: true,
      bkashEnabled: true,
      bkashAccountNumber: null,
      bkashInstructions: "Send payment to the published bKash merchant number and share the transaction ID.",
      nagadEnabled: false,
      nagadAccountNumber: null,
      nagadInstructions: "",
      rocketEnabled: false,
      rocketAccountNumber: null,
      rocketInstructions: "",
      insideDhakaDeliveryCharge: 80,
      subDhakaDeliveryCharge: 100,
      outsideDhakaDeliveryCharge: 130,
      insideDhakaCodEnabled: true,
      subDhakaCodEnabled: true,
      outsideDhakaCodEnabled: true,
      pathaoEnabled: true,
      steadfastEnabled: true,
      redxEnabled: false,
      createdAt: now(),
      updatedAt: now(),
    };
  }
  const prisma = getPrisma();
  const settings = await prisma.setting.findFirst();
  if (settings) return settings;
  return prisma.setting.create({
    data: {
      storeName: "Easy Ecom BD",
      logoText: "Easy Ecom",
      logoUrl: null,
      supportEmail: "support@example.com",
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
      bkashEnabled: true,
      bkashAccountNumber: null,
      bkashInstructions: "Send payment to the published bKash merchant number and share the transaction ID.",
      nagadEnabled: false,
      nagadAccountNumber: null,
      nagadInstructions: "",
      rocketEnabled: false,
      rocketAccountNumber: null,
      rocketInstructions: "",
      insideDhakaDeliveryCharge: 80,
      subDhakaDeliveryCharge: 100,
      outsideDhakaDeliveryCharge: 130,
      insideDhakaCodEnabled: true,
      subDhakaCodEnabled: true,
      outsideDhakaCodEnabled: true,
      pathaoEnabled: true,
      steadfastEnabled: true,
      redxEnabled: false,
    },
  });
}

export async function getState(): Promise<DatabaseState> {
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
    couriers,
    deliveryShipments,
    landingPages,
    landingPageSections,
    coupons,
    inventoryLogs,
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
    prisma.courier.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.deliveryShipment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.landingPage.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.landingPageSection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.inventoryLog.findMany({ orderBy: { createdAt: "desc" } }),
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
    couriers: couriers as unknown as Array<{ id: string; key: "pathao" | "steadfast" | "redx"; name: string; enabled: boolean; description: string }>,
    deliveryShipments: deliveryShipments as unknown as DeliveryShipment[],
    landingPages: landingPages as unknown as LandingPage[],
    landingPageSections: landingPageSections as unknown as LandingPageSection[],
    coupons: coupons as unknown as Coupon[],
    inventoryLogs: inventoryLogs as unknown as InventoryLog[],
    settings: settings as unknown as Settings,
    auditLogs: auditLogs as unknown as DatabaseState["auditLogs"],
  };
}

export async function listCategories() {
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
  const prisma = getPrisma();
  return prisma.product.findMany({ orderBy: [{ featured: "desc" }, { createdAt: "desc" }] }) as unknown as Product[];
}

export async function listProductImages(productId?: string) {
  const prisma = getPrisma();
  return prisma.productImage.findMany({
    where: productId ? { productId } : undefined,
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
  }) as unknown as Array<{ id: string; productId: string; url: string; alt: string; sortOrder: number }>;
}

export async function getProductBySlug(slug: string) {
  const prisma = getPrisma();
  return prisma.product.findUnique({ where: { slug } }) as unknown as Product | null;
}

export async function getProduct(id: string) {
  const prisma = getPrisma();
  return prisma.product.findUnique({ where: { id } }) as unknown as Product | null;
}

function buildProductSearchKeywords(input: {
  name: string;
  sku?: string;
  description?: string;
  tags?: string[];
}) {
  const source = [input.name, input.sku, input.description, ...(input.tags ?? [])].join(" ");
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
    Pick<Product, "name" | "description" | "price" | "categoryId" | "brandId"> & {
      imageUrls?: string[];
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
  const searchKeywords = input.searchKeywords?.length
    ? input.searchKeywords
    : buildProductSearchKeywords({
        name: input.name,
        sku,
        description: input.description,
        tags,
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
          brandId: input.brandId,
          isActive: input.isActive ?? true,
          featured: input.featured ?? false,
          archivedAt: input.archivedAt ?? existing.archivedAt ?? null,
          weightGrams: input.weightGrams ?? 0,
          tags,
          searchKeywords,
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
          brandId: input.brandId,
          isActive: input.isActive ?? true,
          featured: input.featured ?? false,
          archivedAt: input.archivedAt ?? null,
          weightGrams: input.weightGrams ?? 0,
          tags,
          searchKeywords,
        },
      });

  if (input.imageUrls) {
    await prisma.productImage.deleteMany({ where: { productId: record.id } });
    if (input.imageUrls.length) {
      await prisma.productImage.createMany({
        data: input.imageUrls.map((url, index) => ({
          productId: record.id,
          url,
          alt: input.name,
          sortOrder: index,
        })),
      });
    }
  }

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
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } }) as unknown as User | null;
}

export async function findUserById(id: string) {
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { id } }) as unknown as User | null;
}

export async function createUser(
  input: { name: string; email: string; passwordHash: string; role?: User["role"]; phone?: string | null },
  actor?: Actor,
) {
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

export async function getSettings() {
  return (await getSettingsRow()) as unknown as Settings;
}

export async function updateSettings(patch: Partial<Settings>, actor?: Actor) {
  const prisma = getPrisma();
  const existing = await getSettingsRow();
  const record = await prisma.setting.update({
    where: { id: existing.id },
    data: {
      storeName: patch.storeName ?? existing.storeName,
      logoText: patch.logoText ?? existing.logoText,
      logoUrl: patch.logoUrl ?? existing.logoUrl,
      supportEmail: patch.supportEmail ?? existing.supportEmail,
      contactNumber: patch.contactNumber ?? existing.contactNumber,
      address: patch.address ?? existing.address,
      businessHours: patch.businessHours ?? existing.businessHours,
      deliveryAreas: patch.deliveryAreas ?? existing.deliveryAreas,
      returnRefundPolicy: patch.returnRefundPolicy ?? existing.returnRefundPolicy,
      confirmationMessageTemplate: patch.confirmationMessageTemplate ?? existing.confirmationMessageTemplate,
      metaPixelId: patch.metaPixelId ?? existing.metaPixelId,
      gtmContainerId: patch.gtmContainerId ?? existing.gtmContainerId,
      deliveryCharge: patch.deliveryCharge ?? existing.deliveryCharge,
      freeDeliveryThreshold: patch.freeDeliveryThreshold ?? existing.freeDeliveryThreshold,
      codEnabled: patch.codEnabled ?? existing.codEnabled,
      bkashEnabled: patch.bkashEnabled ?? existing.bkashEnabled,
      bkashAccountNumber: patch.bkashAccountNumber ?? existing.bkashAccountNumber,
      bkashInstructions: patch.bkashInstructions ?? existing.bkashInstructions,
      nagadEnabled: patch.nagadEnabled ?? existing.nagadEnabled,
      nagadAccountNumber: patch.nagadAccountNumber ?? existing.nagadAccountNumber,
      nagadInstructions: patch.nagadInstructions ?? existing.nagadInstructions,
      rocketEnabled: patch.rocketEnabled ?? existing.rocketEnabled,
      rocketAccountNumber: patch.rocketAccountNumber ?? existing.rocketAccountNumber,
      rocketInstructions: patch.rocketInstructions ?? existing.rocketInstructions,
      insideDhakaDeliveryCharge: patch.insideDhakaDeliveryCharge ?? existing.insideDhakaDeliveryCharge,
      subDhakaDeliveryCharge: patch.subDhakaDeliveryCharge ?? existing.subDhakaDeliveryCharge,
      outsideDhakaDeliveryCharge: patch.outsideDhakaDeliveryCharge ?? existing.outsideDhakaDeliveryCharge,
      insideDhakaCodEnabled: patch.insideDhakaCodEnabled ?? existing.insideDhakaCodEnabled,
      subDhakaCodEnabled: patch.subDhakaCodEnabled ?? existing.subDhakaCodEnabled,
      outsideDhakaCodEnabled: patch.outsideDhakaCodEnabled ?? existing.outsideDhakaCodEnabled,
      pathaoEnabled: patch.pathaoEnabled ?? existing.pathaoEnabled,
      steadfastEnabled: patch.steadfastEnabled ?? existing.steadfastEnabled,
      redxEnabled: patch.redxEnabled ?? existing.redxEnabled,
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
  const prisma = getPrisma();
  return prisma.cart.findFirst({
    where: ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey },
    include: { items: { include: { product: true } } },
  });
}

export async function getOrCreateCart(guestKey: string, ownerId?: string | null) {
  const prisma = getPrisma();
  const existing = await prisma.cart.findFirst({
    where: ownerId ? { OR: [{ guestKey }, { ownerId }] } : { guestKey },
    include: { items: { include: { product: true } } },
  });
  if (existing) return existing as unknown as Cart & { items: Array<CartItem & { product: Product }> };
  const created = await prisma.cart.create({
    data: { guestKey, ownerId: ownerId ?? null },
    include: { items: { include: { product: true } } },
  });
  return created as unknown as Cart & { items: Array<CartItem & { product: Product }> };
}

export async function clearCart(guestKey: string, ownerId?: string | null, actor?: Actor) {
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
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.archivedAt || !product.isActive) {
    throw new Error("Product is unavailable");
  }
  const cart = await getOrCreateCart(guestKey, ownerId);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });
    const record = existing
      ? await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        })
      : await tx.cartItem.create({
          data: { cartId: cart.id, productId, quantity },
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

export async function getCartSummary(cart: { id: string; items: Array<CartItem & { product?: Product }>; couponCode?: string | null }) {
  const prisma = getPrisma();
  const freshCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: { include: { product: true } } },
  });
  const source = freshCart ?? cart;
  const items = cartToSummaryItems((source.items as Array<PrismaCartItem & { product: PrismaProduct }>).filter((item) => item.product));
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
  const prisma = getPrisma();
  return prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } }) as unknown as Order[];
}

export async function getOrderByCode(orderCode: string) {
  const prisma = getPrisma();
  return prisma.order.findUnique({ where: { orderCode }, include: { items: true } }) as unknown as Order | null;
}

export async function getOrder(orderId: string) {
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
  if (provider === "nagad" && !settings.nagadEnabled) throw new Error("Nagad is disabled");
  if (provider === "rocket" && !settings.rocketEnabled) throw new Error("Rocket is disabled");
}

export function assertDeliveryProviderAvailable(settings: Settings, provider?: "pathao" | "steadfast" | "redx" | null) {
  if (!provider) return;
  if (provider === "pathao" && !settings.pathaoEnabled) throw new Error("Pathao is disabled");
  if (provider === "steadfast" && !settings.steadfastEnabled) throw new Error("Steadfast is disabled");
  if (provider === "redx" && !settings.redxEnabled) throw new Error("RedX is disabled");
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
    deliveryProvider?: "pathao" | "steadfast" | "redx" | null;
    couponCode?: string;
  },
  actor?: Actor,
) {
  const prisma = getPrisma();
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
    assertDeliveryProviderAvailable(settings, input.deliveryProvider);

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
        deliveryProvider: input.deliveryProvider ?? null,
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
    deliveryProvider?: "pathao" | "steadfast" | "redx" | null;
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
  return prisma.$transaction(async (tx) => {
    const settings = (await tx.setting.findFirst()) as unknown as Settings | null;
    if (!settings) throw new Error("Store settings are missing");

    const deliveryZone = input.deliveryZone ?? deriveDeliveryZone(input.district);
    const paymentProvider = input.paymentProvider ?? "cod";
    const orderStatus = input.status ?? "draft";
    assertPaymentMethodAvailable(settings, paymentProvider, deliveryZone);
    assertDeliveryProviderAvailable(settings, input.deliveryProvider);

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
        deliveryProvider: input.deliveryProvider ?? null,
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

export async function updateOrderDelivery(orderId: string, deliveryStatus: DeliveryShipment["status"], actor?: Actor) {
  const prisma = getPrisma();
  const existing = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!existing) return null;
  const record = await prisma.order.update({
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
}

export async function listPayments() {
  const prisma = getPrisma();
  return prisma.payment.findMany({ orderBy: { createdAt: "desc" } }) as unknown as Payment[];
}

export async function getPaymentById(paymentId: string) {
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

export async function listDeliveryShipments() {
  const prisma = getPrisma();
  return prisma.deliveryShipment.findMany({ orderBy: { createdAt: "desc" } }) as unknown as DeliveryShipment[];
}

export async function getShipmentById(shipmentId: string) {
  const prisma = getPrisma();
  return prisma.deliveryShipment.findUnique({ where: { id: shipmentId } }) as unknown as DeliveryShipment | null;
}

export async function getShipmentByTrackingId(trackingId: string) {
  const prisma = getPrisma();
  return prisma.deliveryShipment.findFirst({ where: { trackingId } }) as unknown as DeliveryShipment | null;
}

export async function getShipmentByConsignmentId(consignmentId: string) {
  const prisma = getPrisma();
  return prisma.deliveryShipment.findFirst({ where: { consignmentId } }) as unknown as DeliveryShipment | null;
}

export async function upsertShipment(
  input: Partial<DeliveryShipment> &
    Pick<DeliveryShipment, "orderId" | "courierKey" | "trackingId" | "customerName" | "customerPhone" | "customerAddress">,
  actor?: Actor,
) {
  const prisma = getPrisma();
  const existing = input.id ? await prisma.deliveryShipment.findUnique({ where: { id: input.id } }) : null;
  const record = existing
    ? await prisma.deliveryShipment.update({
        where: { id: existing.id },
        data: {
          orderId: input.orderId,
          courierKey: input.courierKey,
          trackingId: input.trackingId,
          consignmentId: input.consignmentId ?? null,
          status: input.status ?? "courier_created",
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerAddress: input.customerAddress,
          rawResponse: asJson(input.rawResponse ?? {}) as Prisma.InputJsonValue,
        },
      })
    : await prisma.deliveryShipment.create({
        data: {
          orderId: input.orderId,
          courierKey: input.courierKey,
          trackingId: input.trackingId,
          consignmentId: input.consignmentId ?? null,
          status: input.status ?? "courier_created",
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerAddress: input.customerAddress,
          rawResponse: asJson(input.rawResponse ?? {}) as Prisma.InputJsonValue,
        },
      });

  await recordAuditLog({
    actor,
    action: existing ? "update" : "create",
    entity: "shipment",
    entityId: record.id,
    oldValue: existing ? asJson(existing) : null,
    newValue: asJson(record),
  });

  await prisma.order.update({
    where: { id: record.orderId },
    data: {
      deliveryProvider: record.courierKey,
      trackingId: record.trackingId,
      consignmentId: record.consignmentId,
      deliveryStatus: record.status,
    },
  });

  return record as unknown as DeliveryShipment;
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: DeliveryShipment["status"],
  actor?: Actor,
) {
  const prisma = getPrisma();
  const existing = await prisma.deliveryShipment.findUnique({ where: { id: shipmentId } });
  if (!existing) return null;
  const record = await prisma.deliveryShipment.update({
    where: { id: shipmentId },
    data: { status },
  });
  await prisma.order.update({
    where: { id: existing.orderId },
    data: { deliveryStatus: status },
  });
  await recordAuditLog({
    actor,
    action: "update",
    entity: "shipment_status",
    entityId: shipmentId,
    oldValue: asJson(existing),
    newValue: asJson(record),
  });
  return record as unknown as DeliveryShipment;
}

export async function listLandingPages() {
  const prisma = getPrisma();
  return prisma.landingPage.findMany({ orderBy: { createdAt: "desc" } }) as unknown as LandingPage[];
}

export async function getLandingPage(slug: string) {
  const prisma = getPrisma();
  return prisma.landingPage.findUnique({ where: { slug } }) as unknown as LandingPage | null;
}

export async function getLandingPageSections(landingPageId: string) {
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
  const prisma = getPrisma();
  return prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } }) as unknown as Payment[];
}

export async function listAuditLogs() {
  const prisma = getPrisma();
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listInventoryLogs() {
  const prisma = getPrisma();
  return prisma.inventoryLog.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listCouriers() {
  const prisma = getPrisma();
  return prisma.courier.findMany({ orderBy: { createdAt: "asc" } });
}

export async function ensureCourierSeed() {
  const prisma = getPrisma();
  const count = await prisma.courier.count();
  if (count > 0) return;
  await prisma.courier.createMany({
    data: [
      { key: "pathao", name: "Pathao Courier", enabled: true, description: "Fast last-mile coverage for paid and COD shipments." },
      { key: "steadfast", name: "Steadfast Courier", enabled: true, description: "Reliable nationwide parcel coverage." },
    ],
  });
}
