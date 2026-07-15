import { randomUUID } from "crypto";
import { afterEach, expect, test } from "vitest";
import { getPrisma } from "@/server/db";
import {
  addToCart,
  archiveProduct,
  assertDeliveryProviderAvailable,
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

const prisma = getPrisma();

function unique(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
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
      paymentProvider: "bkash",
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

test("delivery zones calculate configured charges and provider config rejects disabled couriers", async () => {
  const settings = await getSettings();

  expect(getDeliveryChargeForZone(settings, "inside_dhaka", 0)).toBe(settings.insideDhakaDeliveryCharge);
  expect(getDeliveryChargeForZone(settings, "sub_dhaka", 0)).toBe(settings.subDhakaDeliveryCharge);
  expect(getDeliveryChargeForZone(settings, "outside_dhaka", 0)).toBe(settings.outsideDhakaDeliveryCharge);
  expect(getDeliveryChargeForZone(settings, "outside_dhaka", settings.freeDeliveryThreshold)).toBe(0);

  expect(() => assertDeliveryProviderAvailable({ ...settings, redxEnabled: false }, "redx")).toThrow(/RedX is disabled/);
  expect(() => assertDeliveryProviderAvailable({ ...settings, redxEnabled: true }, "redx")).not.toThrow();
});
