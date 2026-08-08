import { expect, test } from "vitest";

import { getOrderConfirmationEmail, type OrderConfirmationOrder } from "@/server/email";

/*
F-21. checkoutAction never sent anything until now, so this template and the
wiring around it are both new. The rules that matter to a customer holding a
receipt: the totals in the mail must equal the totals on the order row, and the
tracking link must be the one the redirect uses.
*/

const order: OrderConfirmationOrder = {
  orderCode: "BRN-1042",
  customerName: "Rafiq Hasan",
  district: "Dhaka",
  shippingAddress: "12/A Green Road, Flat 5B",
  subtotal: 2400,
  deliveryCharge: 60,
  discountAmount: 0,
  total: 2460,
};

const items = [
  { quantity: 2, lineTotal: 1800, product: { name: "Cotton Panjabi" } },
  { quantity: 1, lineTotal: 600, product: { name: "Leather Belt" } },
];

const trackUrl = "https://bornohin.com/track-order?code=BRN-1042";

test("the receipt carries the order code, every line and the total", async () => {
  const template = getOrderConfirmationEmail(order, items, trackUrl);

  expect(template.subject).toContain("BRN-1042");
  for (const body of [template.html, template.text]) {
    expect(body).toContain("BRN-1042");
    expect(body).toContain("Cotton Panjabi");
    expect(body).toContain("Leather Belt");
    // money() renders BDT via Intl, so assert on the digits rather than the
    // symbol — the currency prefix differs by ICU build.
    expect(body).toMatch(/2,460/);
  }
});

test("both bodies link to the tracking page the redirect uses", async () => {
  const template = getOrderConfirmationEmail(order, items, trackUrl);

  expect(template.html).toContain(trackUrl);
  expect(template.text).toContain(trackUrl);
});

test("a zero discount is omitted rather than rendered as a line", async () => {
  // "Discount -৳0" on a receipt reads as a pricing bug to the customer.
  const template = getOrderConfirmationEmail(order, items, trackUrl);

  expect(template.html).not.toContain("Discount");
  expect(template.text).not.toContain("Discount");
});

test("a real discount is shown in both bodies", async () => {
  const discounted = { ...order, discountAmount: 240, total: 2220 };

  const template = getOrderConfirmationEmail(discounted, items, trackUrl);

  expect(template.html).toContain("Discount");
  expect(template.text).toContain("Discount");
  expect(template.text).toMatch(/-.*240/);
});

test("customer-supplied text cannot inject markup", async () => {
  // customerName and shippingAddress come straight from an anonymous guest's
  // checkout form. Unescaped, they are markup in the recipient's mail client.
  const hostile = {
    ...order,
    customerName: '<img src=x onerror="alert(1)">',
    shippingAddress: "</td></table><script>alert(2)</script>",
  };

  const template = getOrderConfirmationEmail(hostile, items, trackUrl);

  expect(template.html).not.toContain("<img");
  expect(template.html).not.toContain("<script>");
  expect(template.html).toContain("&lt;img");
});

test("a product name cannot inject markup either", async () => {
  const template = getOrderConfirmationEmail(order, [{ quantity: 1, lineTotal: 10, product: { name: "<b>x</b>" } }], trackUrl);

  expect(template.html).not.toContain("<b>x</b>");
  expect(template.html).toContain("&lt;b&gt;");
});

test("an order with no items still renders", async () => {
  // Defensive: this runs after the order is committed, so a throw here would
  // log an error against an order the customer has already placed.
  const template = getOrderConfirmationEmail(order, [], trackUrl);

  expect(template.html).toContain("BRN-1042");
  expect(template.text).toContain("BRN-1042");
});
