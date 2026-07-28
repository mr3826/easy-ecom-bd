import { randomUUID } from "crypto";
import { access, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, expect, test as baseTest } from "vitest";
import { getPrisma } from "@/server/db";
import {
  addToCart,
  archiveProduct,
  createManualOrder,
  createOrderFromCart,
  deleteProduct,
  findUserByEmail,
  getDeliveryChargeForZone,
  getSettings,
  getCartSummary,
  getOrCreateCart,
  listAuditLogs,
  listProducts,
  setCartCoupon,
  setProductStock,
  updateSettings,
  updateOrderStatus,
  updateOrderDelivery,
  updateOrderPayment,
  updateCartQuantity,
  upsertBrand,
  upsertCategory,
  upsertCoupon,
  upsertProduct,
  replaceProductImages,
  clearCart,
} from "@/server/store";
import { getFileStorage, resetFileStorageForTests } from "@/server/storage";

// These are integration tests: they need a live Postgres and they delete rows
// matching the `test-` / `TEST-` / `@test.local` fixtures. Without DATABASE_URL
// getPrisma() throws at import and takes the whole suite down, which reads as a
// broken build rather than an absent database. Skip instead, so a missing local
// database is reported as "skipped" and never as "passed".
const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const test = baseTest.skipIf(!hasDatabase);
const prisma = hasDatabase ? getPrisma() : (undefined as unknown as ReturnType<typeof getPrisma>);

function unique(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function makeTestFile(name: string, content: string, type = "image/png") {
  const bytes = Buffer.from(content);
  return {
    name,
    type,
    size: bytes.byteLength,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  } as File;
}

async function cleanupTestData() {
  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: {
        OR: [
          { cart: { guestKey: { startsWith: "test-" } } },
          { product: { slug: { startsWith: "test-" } } },
        ],
      },
    }),
    prisma.order.deleteMany({ where: { customerEmail: { endsWith: "@test.local" } } }),
    prisma.cart.deleteMany({ where: { guestKey: { startsWith: "test-" } } }),
    prisma.inventoryLog.deleteMany({ where: { reason: { startsWith: "test-" } } }),
    prisma.product.deleteMany({ where: { slug: { startsWith: "test-" } } }),
    prisma.category.deleteMany({ where: { slug: { startsWith: "test-" } } }),
    prisma.brand.deleteMany({ where: { slug: { startsWith: "test-" } } }),
    prisma.coupon.deleteMany({ where: { code: { startsWith: "TEST-" } } }),
  ]);
}

async function createCatalogItem(stock = 5) {
  const actor = await findUserByEmail("admin@easy-ecom.test");
  const category = await upsertCategory(
    {
      name: unique("test-category"),
      slug: unique("test-category"),
      description: "Test category",
      isActive: true,
    },
    actor ?? undefined,
  );
  const brand = await upsertBrand(
    {
      name: unique("test-brand"),
      slug: unique("test-brand"),
      description: "Test brand",
      isActive: true,
    },
    actor ?? undefined,
  );
  const product = await upsertProduct(
    {
      name: unique("test-product"),
      slug: unique("test-product"),
      sku: unique("SKU"),
      description: "Test product",
      price: 1000,
      stock,
      lowStockThreshold: 2,
      categoryId: category.id,
      brandId: brand.id,
      isActive: true,
      featured: false,
      tags: ["test"],
    },
    actor ?? undefined,
  );
  await replaceProductImages(product.id, ["/hero-products.png"], product.name);
  return { actor, category, brand, product };
}

afterEach(async () => {
  if (!hasDatabase) return;
  await cleanupTestData();
});

test("product CRUD persists and records audit logs", async () => {
  const actor = await findUserByEmail("admin@easy-ecom.test");
  const category = await upsertCategory(
    {
      name: unique("test-category"),
      slug: unique("test-category"),
      description: "Test category",
      isActive: true,
    },
    actor ?? undefined,
  );
  const brand = await upsertBrand(
    {
      name: unique("test-brand"),
      slug: unique("test-brand"),
      description: "Test brand",
      isActive: true,
    },
    actor ?? undefined,
  );
  const product = await upsertProduct(
    {
      name: unique("test-product"),
      slug: unique("test-product"),
      sku: unique("SKU"),
      description: "Test product",
      price: 1250,
      stock: 8,
      categoryId: category.id,
      brandId: brand.id,
      isActive: true,
      featured: true,
      tags: ["test"],
    },
    actor ?? undefined,
  );

  const products = await listProducts();
  expect(products.some((item) => item.id === product.id)).toBe(true);

  const archived = await archiveProduct(product.id, actor ?? undefined);
  expect(archived?.archivedAt).toBeTruthy();

  const deleted = await deleteProduct(product.id, actor ?? undefined);
  expect(deleted?.id).toBe(product.id);

  const auditLogs = await listAuditLogs();
  expect(auditLogs.some((log) => log.entity === "product" && log.entityId === product.id)).toBe(true);
});

test("cart flow and coupon application persist on the backend", async () => {
  const actor = await findUserByEmail("admin@easy-ecom.test");
  const category = await upsertCategory(
    {
      name: unique("test-category"),
      slug: unique("test-category"),
      description: "Test category",
      isActive: true,
    },
    actor ?? undefined,
  );
  const brand = await upsertBrand(
    {
      name: unique("test-brand"),
      slug: unique("test-brand"),
      description: "Test brand",
      isActive: true,
    },
    actor ?? undefined,
  );
  const product = await upsertProduct(
    {
      name: unique("test-product"),
      slug: unique("test-product"),
      sku: unique("SKU"),
      description: "Test product",
      price: 1000,
      stock: 5,
      categoryId: category.id,
      brandId: brand.id,
      isActive: true,
      featured: false,
      tags: ["cart"],
    },
    actor ?? undefined,
  );
  const coupon = await upsertCoupon(
    {
      code: `TEST-${unique("SAVE")}`,
      description: "Test coupon",
      type: "percentage",
      value: 10,
      minOrderAmount: 0,
      isActive: true,
    },
    actor ?? undefined,
  );
  const cart = await getOrCreateCart(unique("test-cart"), actor?.id);
  await addToCart(cart.guestKey, product.id, 1, actor?.id, actor ?? null);
  await updateCartQuantity(cart.guestKey, product.id, 2, actor?.id, actor ?? null);
  await setCartCoupon(cart.guestKey, coupon.code, actor?.id, actor ?? null);

  const summary = await getCartSummary(await getOrCreateCart(cart.guestKey, actor?.id));
  expect(summary.itemCount).toBe(2);
  expect(summary.subtotal).toBe(2000);
  expect(summary.couponCode).toBe(coupon.code);

  await clearCart(cart.guestKey, actor?.id, actor ?? null);
  const cleared = await getCartSummary(await getOrCreateCart(cart.guestKey, actor?.id));
  expect(cleared.itemCount).toBe(0);
  expect(cleared.subtotal).toBe(0);
  expect(cleared.couponCode ?? null).toBeNull();
});

test("cart insertion accepts product id and slug while storing backend product ids", async () => {
  const { actor, product } = await createCatalogItem(6);
  const cart = await getOrCreateCart(unique("test-cart"), actor?.id);

  const firstItem = await addToCart(cart.guestKey, product.slug, 1, actor?.id, actor ?? null);
  expect(firstItem.productId).toBe(product.id);

  const secondItem = await addToCart(cart.guestKey, product.id, 2, actor?.id, actor ?? null);
  expect(secondItem.id).toBe(firstItem.id);
  expect(secondItem.productId).toBe(product.id);

  const summary = await getCartSummary(await getOrCreateCart(cart.guestKey, actor?.id));
  expect(summary.itemCount).toBe(3);
  expect(summary.subtotal).toBe(3000);
});

test("checkout reserves inventory, applies coupons, and persists order totals", async () => {
  const actor = await findUserByEmail("admin@easy-ecom.test");
  const category = await upsertCategory(
    {
      name: unique("test-category"),
      slug: unique("test-category"),
      description: "Test category",
      isActive: true,
    },
    actor ?? undefined,
  );
  const brand = await upsertBrand(
    {
      name: unique("test-brand"),
      slug: unique("test-brand"),
      description: "Test brand",
      isActive: true,
    },
    actor ?? undefined,
  );
  const product = await upsertProduct(
    {
      name: unique("test-product"),
      slug: unique("test-product"),
      sku: unique("SKU"),
      description: "Test product",
      price: 1500,
      stock: 4,
      categoryId: category.id,
      brandId: brand.id,
      isActive: true,
      featured: false,
      tags: ["checkout"],
    },
    actor ?? undefined,
  );
  const coupon = await upsertCoupon(
    {
      code: `TEST-${unique("TEN")}`,
      description: "Ten percent off",
      type: "percentage",
      value: 10,
      minOrderAmount: 0,
      isActive: true,
    },
    actor ?? undefined,
  );
  const cart = await getOrCreateCart(unique("test-cart"), actor?.id);
  await addToCart(cart.guestKey, product.id, 2, actor?.id, actor ?? null);
  await setCartCoupon(cart.guestKey, coupon.code, actor?.id, actor ?? null);

  const order = await createOrderFromCart(
    {
      cart: await getOrCreateCart(cart.guestKey, actor?.id),
      customerName: "Test Checkout",
      customerPhone: "01700000001",
      customerEmail: `checkout-${unique("customer")}@test.local`,
      district: "Dhaka",
      shippingAddress: "Test address",
      paymentProvider: "cod",
      couponCode: coupon.code,
    },
    actor ?? undefined,
  );

  expect(order.subtotal).toBe(3000);
  expect(order.discountAmount).toBe(300);
  expect(order.total).toBeGreaterThan(0);

  const refreshed = await prisma.product.findUnique({ where: { id: product.id } });
  expect(refreshed?.stock).toBe(2);

  const cartAfter = await getOrCreateCart(cart.guestKey, actor?.id);
  const afterSummary = await getCartSummary(cartAfter);
  expect(afterSummary.itemCount).toBe(0);
});

test("inventory and order state changes are durable", async () => {
  const actor = await findUserByEmail("admin@easy-ecom.test");
  const category = await upsertCategory(
    {
      name: unique("test-category"),
      slug: unique("test-category"),
      description: "Test category",
      isActive: true,
    },
    actor ?? undefined,
  );
  const brand = await upsertBrand(
    {
      name: unique("test-brand"),
      slug: unique("test-brand"),
      description: "Test brand",
      isActive: true,
    },
    actor ?? undefined,
  );
  const product = await upsertProduct(
    {
      name: unique("test-product"),
      slug: unique("test-product"),
      sku: unique("SKU"),
      description: "Test product",
      price: 900,
      stock: 3,
      categoryId: category.id,
      brandId: brand.id,
      isActive: true,
      featured: false,
      tags: ["inventory"],
    },
    actor ?? undefined,
  );

  const adjusted = await setProductStock(product.id, 4, "test-restock", actor ?? undefined);
  expect(adjusted?.stock).toBe(7);

  const cart = await getOrCreateCart(unique("test-cart"), actor?.id);
  await addToCart(cart.guestKey, product.id, 2, actor?.id, actor ?? null);
  const order = await createOrderFromCart(
    {
      cart: await getOrCreateCart(cart.guestKey, actor?.id),
      customerName: "Test Order",
      customerPhone: "01700000002",
      customerEmail: `order-${unique("customer")}@test.local`,
      district: "Chattogram",
      shippingAddress: "Test address",
    },
    actor ?? undefined,
  );

  await updateOrderPayment(order.id, { paymentStatus: "failed" }, actor ?? undefined);
  await updateOrderDelivery(order.id, "cancelled", actor ?? undefined);

  const restored = await prisma.product.findUnique({ where: { id: product.id } });
  expect(restored?.stock).toBe(7);

  const latestOrder = await prisma.order.findUnique({ where: { id: order.id } });
  expect(latestOrder?.paymentStatus).toBe("failed");
  expect(latestOrder?.deliveryStatus).toBe("cancelled");

  const logs = await listAuditLogs();
  expect(logs.some((log) => log.entity === "inventory")).toBe(true);
  expect(logs.some((log) => log.entity === "order_payment" && log.entityId === order.id)).toBe(true);
});

test("delivery cancellation restores reserved inventory", async () => {
  const { actor, product } = await createCatalogItem(4);
  const cart = await getOrCreateCart(unique("test-cart"), actor?.id);
  await addToCart(cart.guestKey, product.id, 2, actor?.id, actor ?? null);

  const order = await createOrderFromCart(
    {
      cart: await getOrCreateCart(cart.guestKey, actor?.id),
      customerName: "Delivery Cancel Test",
      customerPhone: "01700000005",
      customerEmail: `delivery-${unique("customer")}@test.local`,
      district: "Dhaka",
      shippingAddress: "Delivery cancellation test address",
      paymentProvider: "cod",
    },
    actor ?? undefined,
  );

  const reserved = await prisma.product.findUnique({ where: { id: product.id } });
  expect(reserved?.stock).toBe(2);

  const cancelled = await updateOrderDelivery(order.id, "cancelled", actor ?? undefined);
  expect(cancelled?.deliveryStatus).toBe("cancelled");

  const restored = await prisma.product.findUnique({ where: { id: product.id } });
  expect(restored?.stock).toBe(4);

  const refreshedOrder = await prisma.order.findUnique({ where: { id: order.id } });
  expect(refreshedOrder?.inventoryReleasedAt).toBeTruthy();
});

test("replacing product images removes orphaned local files but preserves shared references", async () => {
  const originalUploadDir = process.env.UPLOAD_DIR;
  const uploadDir = await mkdtemp(join(tmpdir(), "easy-ecom-uploads-"));
  process.env.UPLOAD_DIR = uploadDir;
  resetFileStorageForTests();

  try {
    const { actor, brand, product } = await createCatalogItem(3);
    const storage = getFileStorage();

    const shared = await storage.save(makeTestFile("shared.png", "shared"), `products/${product.id}`);
    const orphan = await storage.save(makeTestFile("orphan.png", "orphan"), `products/${product.id}`);
    const retained = await storage.save(makeTestFile("retained.png", "retained"), `products/${product.id}`);

    await upsertBrand(
      {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logoUrl: shared.url,
        isActive: brand.isActive,
      },
      actor ?? undefined,
    );

    await replaceProductImages(product.id, [shared.url, orphan.url, retained.url], product.name);
    await replaceProductImages(product.id, [shared.url, retained.url], product.name);

    await expect(access(join(uploadDir, orphan.key))).rejects.toHaveProperty("code", "ENOENT");
    await expect(access(join(uploadDir, shared.key))).resolves.toBeUndefined();
    await expect(access(join(uploadDir, retained.key))).resolves.toBeUndefined();
  } finally {
    resetFileStorageForTests();
    if (originalUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = originalUploadDir;
    }
  }
});

test("product stock validation rejects negative inventory", async () => {
  const { actor, product } = await createCatalogItem(1);

  await expect(setProductStock(product.id, -2, "test-negative-stock", actor ?? undefined)).rejects.toThrow(
    /Insufficient stock/,
  );

  const refreshed = await prisma.product.findUnique({ where: { id: product.id } });
  expect(refreshed?.stock).toBe(1);
});

test("manual order creation supports draft lifecycle and stock reservation on confirmation", async () => {
  const { actor, product } = await createCatalogItem(3);

  const order = await createManualOrder(
    {
      customerName: "Manual Customer",
      customerPhone: "01700000003",
      customerEmail: `manual-${unique("customer")}@test.local`,
      district: "Dhaka",
      shippingAddress: "Manual test address",
      status: "draft",
      paymentProvider: "cod",
      deliveryZone: "inside_dhaka",
      items: [{ productId: product.id, quantity: 2 }],
      adminNotes: "test manual draft",
    },
    actor ?? undefined,
  );

  expect(order.status).toBe("draft");
  expect(order.items[0]?.unitPrice).toBe(1000);

  const unchanged = await prisma.product.findUnique({ where: { id: product.id } });
  expect(unchanged?.stock).toBe(3);

  const confirmed = await updateOrderStatus(order.id, "confirmed", actor ?? undefined, "test confirm");
  expect(confirmed?.status).toBe("confirmed");

  const reserved = await prisma.product.findUnique({ where: { id: product.id } });
  expect(reserved?.stock).toBe(1);

  await expect(updateOrderStatus(order.id, "draft", actor ?? undefined)).rejects.toThrow(/Cannot move order/);

  const history = await prisma.orderStatusHistory.findMany({ where: { orderId: order.id } });
  expect(history.map((entry) => entry.toStatus)).toEqual(expect.arrayContaining(["draft", "confirmed"]));
});

test("disabled payment methods are rejected by backend order creation", async () => {
  const { actor, product } = await createCatalogItem(2);
  const settings = await getSettings();
  try {
    await updateSettings({ bkashEnabled: false }, actor ?? undefined);

    const cart = await getOrCreateCart(unique("test-cart"), actor?.id);
    await addToCart(cart.guestKey, product.id, 1, actor?.id, actor ?? null);

    await expect(
      createOrderFromCart(
        {
          cart: await getOrCreateCart(cart.guestKey, actor?.id),
          customerName: "Payment Disabled",
          customerPhone: "01700000004",
          customerEmail: `payment-${unique("customer")}@test.local`,
          district: "Dhaka",
          shippingAddress: "Payment validation address",
          paymentProvider: "bkash",
        },
        actor ?? undefined,
      ),
    ).rejects.toThrow(/bKash is disabled/);
  } finally {
    await updateSettings({ bkashEnabled: settings.bkashEnabled }, actor ?? undefined);
  }
});

test("delivery zones calculate configured charges", async () => {
  const settings = await getSettings();

  expect(getDeliveryChargeForZone(settings, "inside_dhaka", 0)).toBe(settings.insideDhakaDeliveryCharge);
  expect(getDeliveryChargeForZone(settings, "sub_dhaka", 0)).toBe(settings.subDhakaDeliveryCharge);
  expect(getDeliveryChargeForZone(settings, "outside_dhaka", 0)).toBe(settings.outsideDhakaDeliveryCharge);
  expect(getDeliveryChargeForZone(settings, "outside_dhaka", settings.freeDeliveryThreshold)).toBe(0);
});

test("settings allow nullable fields to be cleared and reject negative charges", async () => {
  const settings = await getSettings();
  const actor = await findUserByEmail("admin@easy-ecom.test");

  try {
    await updateSettings(
      {
        logoUrl: "https://example.com/test-logo.png",
        supportEmail: "settings@test.local",
      },
      actor ?? undefined,
    );
    await updateSettings({ logoUrl: null, supportEmail: null }, actor ?? undefined);

    const cleared = await getSettings();
    expect(cleared.logoUrl).toBeNull();
    expect(cleared.supportEmail).toBeNull();

    await expect(
      updateSettings({ metaPixelId: '12345";alert(1)//' }, actor ?? undefined),
    ).rejects.toThrow(/Meta Pixel ID/);
    await expect(
      updateSettings({ gtmContainerId: 'GTM-ABC123"><script>alert(1)</script>' }, actor ?? undefined),
    ).rejects.toThrow(/GTM container ID/);

    await expect(
      updateSettings({ outsideDhakaDeliveryCharge: -1 }, actor ?? undefined),
    ).rejects.toThrow(/non-negative integer/);
  } finally {
    await updateSettings(
      {
        logoUrl: settings.logoUrl,
        supportEmail: settings.supportEmail,
      },
      actor ?? undefined,
    );
  }
});
