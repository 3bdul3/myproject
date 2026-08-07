"use server";

import { revalidatePath } from "next/cache";
import { db, nextNumber } from "@/lib/db";
import type { Product, PurchaseOrder, StockMovement, Supplier, Warehouse } from "@/types";

export async function listProducts() {
  return db.products.findAsync<Product>({}).sort({ name: 1 });
}

export async function createProduct(formData: FormData) {
  await db.products.insertAsync<Product>({
    sku: String(formData.get("sku")),
    name: String(formData.get("name")),
    category: String(formData.get("category")),
    unit: String(formData.get("unit")),
    costPrice: Number(formData.get("costPrice")),
    salePrice: Number(formData.get("salePrice")),
    reorderLevel: Number(formData.get("reorderLevel") || 0),
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/inventory/products");
}

export async function deleteProduct(id: string) {
  await db.products.removeAsync({ _id: id }, {});
  revalidatePath("/inventory/products");
}

export async function listWarehouses() {
  return db.warehouses.findAsync<Warehouse>({}).sort({ name: 1 });
}

export async function createWarehouse(formData: FormData) {
  await db.warehouses.insertAsync<Warehouse>({
    name: String(formData.get("name")),
    location: String(formData.get("location")),
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/inventory/warehouses");
}

export async function listStockMovements() {
  return db.stockMovements.findAsync<StockMovement>({}).sort({ createdAt: -1 });
}

export async function createStockMovement(formData: FormData) {
  const productId = String(formData.get("productId"));
  const product = await db.products.findOneAsync<Product>({ _id: productId });

  await db.stockMovements.insertAsync<StockMovement>({
    productId,
    productName: product?.name ?? "Unknown",
    warehouseId: String(formData.get("warehouseId")),
    type: String(formData.get("type")) as StockMovement["type"],
    qty: Number(formData.get("qty")),
    ref: String(formData.get("ref") || "Manual adjustment"),
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/inventory/stock");
}

export async function getStockLevels() {
  const [movements, products] = await Promise.all([
    db.stockMovements.findAsync<StockMovement>({}),
    db.products.findAsync<Product>({}),
  ]);

  const balances = new Map<string, number>();
  for (const m of movements) {
    const current = balances.get(m.productId) ?? 0;
    const delta = m.type === "out" ? -m.qty : m.qty;
    balances.set(m.productId, current + delta);
  }

  return products.map((p) => ({
    product: p,
    quantity: balances.get(p._id!) ?? 0,
    lowStock: (balances.get(p._id!) ?? 0) <= p.reorderLevel,
  }));
}

export async function listSuppliers() {
  return db.suppliers.findAsync<Supplier>({}).sort({ createdAt: -1 });
}

export async function createSupplier(formData: FormData) {
  await db.suppliers.insertAsync<Supplier>({
    name: String(formData.get("name")),
    vatNumber: String(formData.get("vatNumber") || ""),
    crNumber: String(formData.get("crNumber") || ""),
    email: String(formData.get("email")),
    phone: String(formData.get("phone")),
    address: String(formData.get("address") || ""),
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/inventory/suppliers");
}

export async function listPurchaseOrders() {
  return db.purchaseOrders.findAsync<PurchaseOrder>({}).sort({ createdAt: -1 });
}

export async function createPurchaseOrder(formData: FormData) {
  const supplierId = String(formData.get("supplierId"));
  const supplier = await db.suppliers.findOneAsync<Supplier>({ _id: supplierId });
  const warehouseId = String(formData.get("warehouseId"));
  const date = String(formData.get("date"));
  const items: Array<{ productId: string; productName: string; qty: number; cost: number }> = JSON.parse(
    String(formData.get("items") || "[]")
  );

  const total = items.reduce((s, i) => s + i.qty * i.cost, 0);
  const count = await db.purchaseOrders.countAsync({});
  const number = nextNumber("PO", count + 1);

  await db.purchaseOrders.insertAsync<PurchaseOrder>({
    number,
    supplierId,
    supplierName: supplier?.name ?? "Unknown",
    date,
    items,
    total,
    status: "draft",
    warehouseId,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/inventory/purchase-orders");
}

export async function receivePurchaseOrder(orderId: string) {
  const order = await db.purchaseOrders.findOneAsync<PurchaseOrder>({ _id: orderId });
  if (!order || order.status === "received") return;

  for (const item of order.items) {
    await db.stockMovements.insertAsync<StockMovement>({
      productId: item.productId,
      productName: item.productName,
      warehouseId: order.warehouseId,
      type: "in",
      qty: item.qty,
      ref: order.number,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    });
  }

  // Receiving goods only updates stock. The Accounts Payable / Inventory journal entry
  // is posted separately when the accountant records and posts the supplier's Bill
  // against this PO (see src/lib/actions/ap.ts) — receiving goods is not the same
  // event as receiving the supplier's invoice, and posting AP here would double-count
  // once the bill is posted too.
  await db.purchaseOrders.updateAsync({ _id: orderId }, { $set: { status: "received" } });

  revalidatePath("/inventory/purchase-orders");
  revalidatePath("/inventory/stock");
}
