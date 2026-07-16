import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { createSeedState } from "../src/server/seed";

function getClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new PrismaClient({
    adapter: new PrismaPg(connectionString),
  });
}

async function clearDatabase(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.orderStatusHistory.deleteMany(),
    prisma.inventoryLog.deleteMany(),
    prisma.paymentLog.deleteMany(),
    prisma.deliveryShipment.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.landingPageSection.deleteMany(),
    prisma.landingPage.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.category.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.courier.deleteMany(),
  ]);
}

async function main() {
  const prisma = getClient();
  const state = createSeedState();

  try {
    await clearDatabase(prisma);

    await prisma.setting.create({ data: state.settings });
    await prisma.user.createMany({ data: state.users });
    await prisma.category.createMany({ data: state.categories });
    await prisma.brand.createMany({ data: state.brands });
    await prisma.courier.createMany({ data: state.couriers });
    await prisma.product.createMany({
      data: state.products.map(({ metadata, ...product }) => ({
        ...product,
        ...(metadata ? { metadata: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue } : {}),
      })),
    });
    await prisma.productImage.createMany({ data: state.productImages });
    await prisma.coupon.createMany({ data: state.coupons });
    await prisma.landingPage.createMany({ data: state.landingPages });
    await prisma.landingPageSection.createMany({ data: state.landingPageSections });
    await prisma.cart.createMany({
      data: state.carts.map((cart) => {
        const { items, ...rest } = cart;
        void items;
        return rest;
      }),
    });
    await prisma.cartItem.createMany({
      data: state.carts.flatMap((cart) => cart.items.map((item) => ({ ...item, cartId: cart.id }))),
    });
    await prisma.order.create({
      data: {
        ...state.orders[0],
        items: {
          create: state.orders[0].items,
        },
      },
    });
    await prisma.orderStatusHistory.createMany({ data: state.orderStatusHistory });
    await prisma.payment.createMany({
      data: state.payments.map((payment) => ({
        ...payment,
        rawResponse: payment.rawResponse as Prisma.InputJsonValue,
      })),
    });
    await prisma.deliveryShipment.createMany({
      data: state.deliveryShipments.map((shipment) => ({
        ...shipment,
        rawResponse: shipment.rawResponse as Prisma.InputJsonValue,
      })),
    });
    await prisma.auditLog.createMany({
      data: state.auditLogs.map((log) => ({
        ...log,
        oldValue: log.oldValue as Prisma.InputJsonValue | undefined,
        newValue: log.newValue as Prisma.InputJsonValue | undefined,
      })),
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
