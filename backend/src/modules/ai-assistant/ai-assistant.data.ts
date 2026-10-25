import { db } from "../../store/db.js";
import { merchantView } from "../merchants/merchants.routes.js";

export function getAssistantContext(customerId: string) {
  // Only expose merchants approved for the public catalog.
  const approvedMerchants = [...db.merchants.values()].filter(
    (merchant) => merchant.approval === "approved"
  );

  const approvedMerchantIds = new Set(
    approvedMerchants.map((merchant) => merchant.id)
  );

  // Reuse the existing public merchant view.
  // This includes opening hours and calculated openNow status.
  const merchants = approvedMerchants.map((merchant) =>
    merchantView(merchant)
  );

  // Select customer-facing fields.
  // Do not send internal ingredient costs to the AI.
  const dishes = [...db.dishes.values()]
    .filter((dish) => approvedMerchantIds.has(dish.merchantId))
    .map((dish) => ({
      id: dish.id,
      merchantId: dish.merchantId,
      name: dish.name,
      image: dish.image,
      description: dish.description,
      price: dish.price,
      category: dish.category,
      calories: dish.calories,
      soldOut: dish.soldOut || dish.stock === 0,
      spicy: dish.spicy ?? false,
      dietary: dish.dietary.filter((tag) => tag !== "allergy_free"),
      style: dish.style,
      customisations: dish.customisations,

      // The current Dish schema has no verified allergen list.
      // Unknown does not mean allergen-free.
      allergens: null,
    }));

  // Match the existing catalog's voucher availability checks.
  const today = new Date().toISOString().slice(0, 10);

  const vouchers = db.vouchers
    .filter(
      (voucher) =>
        voucher.active &&
        (!voucher.expiryDate || voucher.expiryDate >= today) &&
        (voucher.totalLimit === undefined ||
          voucher.claimed < voucher.totalLimit) &&
        (!voucher.merchantId ||
          approvedMerchantIds.has(voucher.merchantId))
    )
    .map((voucher) => ({
      id: voucher.id,
      title: voucher.title,
      description: voucher.description,
      amount: voucher.amount,
      kind: voucher.kind,
      minSpend: voucher.minSpend,
      requireCategory: voucher.requireCategory,
      merchantId: voucher.merchantId,
      expiryDate: voucher.expiryDate,
    }));

  // Filter by ownership BEFORE selecting any order data.
  // customerId must come from authentication, never the request body.
  const ownOrders = [...db.orders.values()]
    .filter((order) => order.customerId === customerId)
    .sort((a, b) => b.createdAt - a.createdAt);

  // Exclude personal contact details, addresses, and payment IDs.
  const orders = ownOrders.map((order) => ({
    id: order.id,
    merchantId: order.merchantId,
    merchantName: order.merchantName,
    status: order.status,
    createdAt: order.createdAt,
    total: order.total,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    refunded: order.refunded,
    paidAt: order.paidAt,
    payBy: order.payBy,
    decision: order.decision,
    items: order.items.map((item) => ({
      dishId: item.dishId,
      name: item.name,
      price: item.price,
      qty: item.qty,
      mode: item.mode,
      status: item.status,
    })),
  }));

  const activeStatuses = new Set([
    "awaiting_merchant",
    "awaiting_payment",
    "preparing",
  ]);

  const activeOrders = orders.filter((order) =>
    activeStatuses.has(order.status)
  );

  const orderHistory = orders
    .filter((order) => !activeStatuses.has(order.status))
    .slice(0, 10);

  return {
    source: "ScootMeal server demo store",
    merchants,
    dishes,
    vouchers,
    activeOrders,
    orderHistory,
    orderHistoryLimit: 10,
    totalOwnOrders: ownOrders.length,
    allergenInformationAvailable: false,
  };
}