import { randomUUID } from "crypto";
import type {
  Brand,
  Cart,
  CartItem,
  Category,
  Coupon,
  DatabaseState,
  DeliveryShipment,
  LandingPage,
  LandingPageSection,
  Order,
  OrderItem,
  Payment,
  PaymentLog,
  Product,
  Settings,
  User,
} from "@/lib/domain";
import { createSeedState } from "@/server/seed";
import { money, slugify } from "@/lib/utils";

declare global {
  var __easyEcomState: DatabaseState | undefined;
}

function createState() {
  return createSeedState();
}

export function getState() {
  if (!globalThis.__easyEcomState) {
    globalThis.__easyEcomState = createState();
  }
  return globalThis.__easyEcomState;
}

export function resetState() {
  globalThis.__easyEcomState = createState();
  return getState();
}

function audit(entity: string, entityId: string, action: string, note: string, actorEmail = "system@easy-ecom.test") {
  const state = getState();
  state.auditLogs.unshift({
    id: randomUUID(),
    actorEmail,
    action,
    entity,
    entityId,
    note,
    createdAt: new Date().toISOString(),
  });
}

export function listCategories() {
  return getState().categories;
}

export function upsertCategory(input: Partial<Category> & Pick<Category, "name" | "description">) {
  const state = getState();
  const id = input.id ?? randomUUID();
  const existing = state.categories.find((item) => item.id === id);
  const record: Category = {
    id,
    name: input.name,
    slug: input.slug ?? slugify(input.name),
    description: input.description,
    isActive: input.isActive ?? true,
  };

  if (existing) {
    Object.assign(existing, record);
    audit("category", id, "update", `Updated category ${record.name}`);
  } else {
    state.categories.unshift(record);
    audit("category", id, "create", `Created category ${record.name}`);
  }

  return record;
}

export function deleteCategory(id: string) {
  const state = getState();
  state.categories = state.categories.filter((item) => item.id !== id);
  audit("category", id, "delete", "Deleted category");
}

export function listBrands() {
  return getState().brands;
}

export function upsertBrand(input: Partial<Brand> & Pick<Brand, "name" | "description">) {
  const state = getState();
  const id = input.id ?? randomUUID();
  const existing = state.brands.find((item) => item.id === id);
  const record: Brand = {
    id,
    name: input.name,
    slug: input.slug ?? slugify(input.name),
    description: input.description,
    isActive: input.isActive ?? true,
  };

  if (existing) {
    Object.assign(existing, record);
    audit("brand", id, "update", `Updated brand ${record.name}`);
  } else {
    state.brands.unshift(record);
    audit("brand", id, "create", `Created brand ${record.name}`);
  }
  return record;
}

export function deleteBrand(id: string) {
  const state = getState();
  state.brands = state.brands.filter((item) => item.id !== id);
  audit("brand", id, "delete", "Deleted brand");
}

export function listProducts() {
  return getState().products;
}

export function getProductBySlug(slug: string) {
  return getState().products.find((product) => product.slug === slug);
}

export function getProduct(id: string) {
  return getState().products.find((product) => product.id === id);
}

export function upsertProduct(input: Partial<Product> & Pick<Product, "name" | "description" | "price" | "categoryId" | "brandId">) {
  const state = getState();
  const id = input.id ?? randomUUID();
  const existing = state.products.find((item) => item.id === id);
  const record: Product = {
    id,
    name: input.name,
    slug: input.slug ?? slugify(input.name),
    sku: input.sku ?? `${slugify(input.name).toUpperCase()}-${state.products.length + 1}`,
    description: input.description,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    stock: input.stock ?? 0,
    categoryId: input.categoryId,
    brandId: input.brandId,
    isActive: input.isActive ?? true,
    featured: input.featured ?? false,
    weightGrams: input.weightGrams ?? 0,
    tags: input.tags ?? [],
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, record);
    audit("product", id, "update", `Updated product ${record.name}`);
  } else {
    state.products.unshift(record);
    audit("product", id, "create", `Created product ${record.name}`);
  }

  return record;
}

export function deleteProduct(id: string) {
  const state = getState();
  state.products = state.products.filter((item) => item.id !== id);
  state.productImages = state.productImages.filter((item) => item.productId !== id);
  audit("product", id, "delete", "Deleted product");
}

export function setProductStock(productId: string, change: number, reason: string) {
  const state = getState();
  const product = state.products.find((item) => item.id === productId);
  if (!product) return null;
  product.stock += change;
  state.inventoryLogs.unshift({
    id: randomUUID(),
    productId,
    change,
    reason,
    createdAt: new Date().toISOString(),
  });
  audit("inventory", productId, "update", `${reason}: ${change}`);
  return product;
}

export function listCoupons() {
  return getState().coupons;
}

export function upsertCoupon(input: Partial<Coupon> & Pick<Coupon, "code" | "description" | "type" | "value">) {
  const state = getState();
  const id = input.id ?? randomUUID();
  const existing = state.coupons.find((item) => item.id === id);
  const record: Coupon = {
    id,
    code: input.code.toUpperCase(),
    description: input.description,
    type: input.type,
    value: input.value,
    minOrderAmount: input.minOrderAmount ?? 0,
    isActive: input.isActive ?? true,
  };

  if (existing) Object.assign(existing, record);
  else state.coupons.unshift(record);

  audit("coupon", id, existing ? "update" : "create", `${existing ? "Updated" : "Created"} coupon ${record.code}`);
  return record;
}

export function listCarts() {
  return getState().carts;
}

export function getOrCreateCart(guestKey: string, ownerId?: string) {
  const state = getState();
  let cart = state.carts.find((item) => item.guestKey === guestKey || (ownerId && item.ownerId === ownerId));
  if (!cart) {
    cart = {
      id: randomUUID(),
      ownerId,
      guestKey,
      items: [],
      updatedAt: new Date().toISOString(),
    };
    state.carts.unshift(cart);
  }
  return cart;
}

export function addToCart(guestKey: string, productId: string, quantity = 1, ownerId?: string) {
  const cart = getOrCreateCart(guestKey, ownerId);
  const item = cart.items.find((entry) => entry.productId === productId);
  if (item) item.quantity += quantity;
  else cart.items.unshift({ id: randomUUID(), productId, quantity });
  cart.updatedAt = new Date().toISOString();
  return cart;
}

export function removeCartItem(guestKey: string, productId: string, ownerId?: string) {
  const cart = getOrCreateCart(guestKey, ownerId);
  cart.items = cart.items.filter((entry) => entry.productId !== productId);
  cart.updatedAt = new Date().toISOString();
  return cart;
}

export function updateCartQuantity(guestKey: string, productId: string, quantity: number, ownerId?: string) {
  const cart = getOrCreateCart(guestKey, ownerId);
  const item = cart.items.find((entry) => entry.productId === productId);
  if (!item) return cart;
  item.quantity = Math.max(1, quantity);
  cart.updatedAt = new Date().toISOString();
  return cart;
}

export function getCartSummary(cart: Cart) {
  const products = getState().products;
  const items = cart.items
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) return null;
      return {
        ...item,
        product,
        lineTotal: product.price * item.quantity,
      };
    })
    .filter(Boolean) as Array<CartItem & { product: Product; lineTotal: number }>;

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    items,
    subtotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    formattedSubtotal: money(subtotal),
  };
}

export function listOrders() {
  return getState().orders;
}

export function getOrderByCode(orderCode: string) {
  return getState().orders.find((order) => order.orderCode === orderCode);
}

export function getOrder(orderId: string) {
  return getState().orders.find((order) => order.id === orderId);
}

export function createOrderFromCart(input: {
  cart: Cart;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  notes?: string;
  paymentProvider: "bkash" | "nagad";
  couponCode?: string;
}) {
  const state = getState();
  const summary = getCartSummary(input.cart);
  const couponCode = input.couponCode?.toUpperCase();
  const coupon = couponCode
    ? state.coupons.find((item) => item.code === couponCode && item.isActive)
    : undefined;

  const discountAmount =
    coupon && summary.subtotal >= coupon.minOrderAmount
      ? coupon.type === "percentage"
        ? Math.round((summary.subtotal * coupon.value) / 100)
        : coupon.value
      : 0;

  const deliveryCharge =
    summary.subtotal - discountAmount >= state.settings.freeDeliveryThreshold ? 0 : state.settings.deliveryCharge;

  const orderItems: OrderItem[] = summary.items.map((item) => ({
    id: randomUUID(),
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.product.price,
    lineTotal: item.lineTotal,
  }));

  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal - discountAmount + deliveryCharge;
  const now = new Date().toISOString();
  const orderCode = `EE-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${1000 + state.orders.length + 1}`;

  const order: Order = {
    id: randomUUID(),
    orderCode,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    shippingAddress: input.shippingAddress,
    deliveryCharge,
    discountAmount,
    subtotal,
    total,
    paymentStatus: "pending",
    deliveryStatus: "pending",
    paymentProvider: input.paymentProvider,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
    items: orderItems,
  };

  state.orders.unshift(order);
  input.cart.items = [];
  input.cart.updatedAt = now;
  audit("order", order.id, "create", `Created order ${order.orderCode}`);
  return order;
}

export function updateOrderPayment(orderId: string, patch: { paymentStatus?: Payment["status"]; paymentProvider?: Payment["provider"] }) {
  const order = getOrder(orderId);
  if (!order) return null;
  if (patch.paymentStatus) order.paymentStatus = patch.paymentStatus;
  if (patch.paymentProvider) order.paymentProvider = patch.paymentProvider;
  order.updatedAt = new Date().toISOString();
  return order;
}

export function updateOrderDelivery(orderId: string, deliveryStatus: DeliveryShipment["status"]) {
  const order = getOrder(orderId);
  if (!order) return null;
  order.deliveryStatus = deliveryStatus;
  order.updatedAt = new Date().toISOString();
  return order;
}

export function listPayments() {
  return getState().payments;
}

export function upsertPayment(input: Omit<Payment, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string; updatedAt?: string }) {
  const state = getState();
  const id = input.id ?? randomUUID();
  const existing = state.payments.find((item) => item.id === id);
  const record: Payment = {
    id,
    orderId: input.orderId,
    provider: input.provider,
    transactionId: input.transactionId,
    amount: input.amount,
    status: input.status,
    rawResponse: input.rawResponse,
    createdAt: input.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
  if (existing) Object.assign(existing, record);
  else state.payments.unshift(record);
  audit("payment", id, existing ? "update" : "create", `${existing ? "Updated" : "Created"} payment ${record.transactionId}`);
  return record;
}

export function addPaymentLog(paymentId: string, stage: PaymentLog["stage"], payload: Record<string, unknown>) {
  const state = getState();
  state.paymentLogs.unshift({
    id: randomUUID(),
    paymentId,
    stage,
    payload,
    createdAt: new Date().toISOString(),
  });
}

export function listDeliveryShipments() {
  return getState().deliveryShipments;
}

export function upsertShipment(input: Partial<DeliveryShipment> & Pick<DeliveryShipment, "orderId" | "courierKey" | "trackingId" | "customerName" | "customerPhone" | "customerAddress">) {
  const state = getState();
  const id = input.id ?? randomUUID();
  const existing = state.deliveryShipments.find((item) => item.id === id);
  const record: DeliveryShipment = {
    id,
    orderId: input.orderId,
    courierKey: input.courierKey,
    trackingId: input.trackingId,
    consignmentId: input.consignmentId,
    status: input.status ?? "courier_created",
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerAddress: input.customerAddress,
    rawResponse: input.rawResponse ?? {},
    createdAt: input.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, record);
  else state.deliveryShipments.unshift(record);
  audit("shipment", id, existing ? "update" : "create", `Shipment ${record.trackingId} saved`);
  return record;
}

export function updateShipmentStatus(shipmentId: string, status: DeliveryShipment["status"]) {
  const shipment = getState().deliveryShipments.find((item) => item.id === shipmentId);
  if (!shipment) return null;
  shipment.status = status;
  shipment.updatedAt = new Date().toISOString();
  updateOrderDelivery(shipment.orderId, status);
  return shipment;
}

export function listLandingPages() {
  return getState().landingPages;
}

export function getLandingPage(slug: string) {
  return getState().landingPages.find((page) => page.slug === slug);
}

export function getLandingPageSections(landingPageId: string) {
  return getState().landingPageSections
    .filter((section) => section.landingPageId === landingPageId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function upsertLandingPage(input: Partial<LandingPage> & Pick<LandingPage, "slug" | "title" | "metaDescription" | "heroTitle" | "heroSubtitle">) {
  const state = getState();
  const id = input.id ?? randomUUID();
  const existing = state.landingPages.find((item) => item.id === id);
  const record: LandingPage = {
    id,
    slug: slugify(input.slug),
    title: input.title,
    metaDescription: input.metaDescription,
    heroTitle: input.heroTitle,
    heroSubtitle: input.heroSubtitle,
    bannerImageUrl: input.bannerImageUrl,
    published: input.published ?? false,
    attachedProductIds: input.attachedProductIds ?? [],
    createdAt: input.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, record);
  else state.landingPages.unshift(record);
  audit("landing-page", id, existing ? "update" : "create", `${existing ? "Updated" : "Created"} landing page ${record.slug}`);
  return record;
}

export function upsertLandingPageSection(input: Partial<LandingPageSection> & Pick<LandingPageSection, "landingPageId" | "type">) {
  const state = getState();
  const id = input.id ?? randomUUID();
  const existing = state.landingPageSections.find((item) => item.id === id);
  const record: LandingPageSection = {
    id,
    landingPageId: input.landingPageId,
    type: input.type,
    title: input.title,
    subtitle: input.subtitle,
    body: input.body,
    imageUrl: input.imageUrl,
    productIds: input.productIds ?? [],
    items: input.items ?? [],
    ctaLabel: input.ctaLabel,
    ctaHref: input.ctaHref,
    sortOrder: input.sortOrder ?? 0,
  };
  if (existing) Object.assign(existing, record);
  else state.landingPageSections.unshift(record);
  audit("landing-page-section", id, existing ? "update" : "create", `${existing ? "Updated" : "Created"} landing page section`);
  return record;
}

export function updateSettings(patch: Partial<Settings>) {
  const state = getState();
  state.settings = { ...state.settings, ...patch };
  audit("settings", "global", "update", "Updated store settings");
  return state.settings;
}

export function listUsers() {
  return getState().users;
}

export function findUserByEmail(email: string) {
  return getState().users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string) {
  return getState().users.find((user) => user.id === id);
}

export function createUser(input: { name: string; email: string; passwordHash: string; role?: User["role"]; phone?: string }) {
  const state = getState();
  const record: User = {
    id: randomUUID(),
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    role: input.role ?? "customer",
    phone: input.phone,
    createdAt: new Date().toISOString(),
  };
  state.users.unshift(record);
  audit("user", record.id, "create", `Created user ${record.email}`);
  return record;
}

export function getSettings() {
  return getState().settings;
}

export function formatOrderSummary(order: Order) {
  return `${money(order.total)} • ${order.paymentStatus} • ${order.deliveryStatus}`;
}
