"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, nextNumber } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveCompanyId } from "@/lib/authz";
import { ensureApprovalRequest } from "@/lib/actions/approvals";
import { logAudit } from "@/lib/actions/auditLog";
import type { Product, PurchaseOrder, StockMovement, Supplier, Warehouse } from "@/types";

export async function listProducts() {
  const companyId = await getActiveCompanyId();
  return db.products.findAsync<Product>(companyId, { archived: { $ne: true } }).sort({ name: 1 });
}

export async function listArchivedProducts() {
  const companyId = await getActiveCompanyId();
  return db.products.findAsync<Product>(companyId, { archived: true }).sort({ name: 1 });
}

export async function createProduct(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const sku = String(formData.get("sku"));
  await db.products.insertAsync<Product>(companyId, {
    sku,
    skuKey: `${companyId}:${sku}`,
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
  const companyId = await getActiveCompanyId();
  const session = await auth();
  const product = await db.products.findOneAsync<Product>(companyId, { _id: id });
  await db.products.updateAsync(companyId, { _id: id }, { $set: { archived: true } });
  if (session?.user && product) {
    await logAudit(companyId, session.user.id, session.user.name ?? "", "archive_product", "product", id, `Archived product ${product.name}`);
  }
  revalidatePath("/inventory/products");
}

export async function restoreProduct(id: string) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  const product = await db.products.findOneAsync<Product>(companyId, { _id: id });
  await db.products.updateAsync(companyId, { _id: id }, { $set: { archived: false } });
  if (session?.user && product) {
    await logAudit(companyId, session.user.id, session.user.name ?? "", "restore_product", "product", id, `Restored product ${product.name}`);
  }
  revalidatePath("/inventory/products");
}

export async function listWarehouses() {
  const companyId = await getActiveCompanyId();
  return db.warehouses.findAsync<Warehouse>(companyId, {}).sort({ name: 1 });
}

export async function createWarehouse(formData: FormData) {
  const companyId = await getActiveCompanyId();
  await db.warehouses.insertAsync<Warehouse>(companyId, {
    name: String(formData.get("name")),
    location: String(formData.get("location")),
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/inventory/warehouses");
}

export async function listStockMovements() {
  const companyId = await getActiveCompanyId();
  return db.stockMovements.findAsync<StockMovement>(companyId, {}).sort({ createdAt: -1 });
}

export async function createStockMovement(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const productId = String(formData.get("productId"));
  const product = await db.products.findOneAsync<Product>(companyId, { _id: productId });

  await db.stockMovements.insertAsync<StockMovement>(companyId, {
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
  const companyId = await getActiveCompanyId();
  const [movements, products] = await Promise.all([
    db.stockMovements.findAsync<StockMovement>(companyId, {}),
    db.products.findAsync<Product>(companyId, { archived: { $ne: true } }),
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
  const companyId = await getActiveCompanyId();
  return db.suppliers.findAsync<Supplier>(companyId, {}).sort({ createdAt: -1 });
}

export async function getSupplier(id: string) {
  const companyId = await getActiveCompanyId();
  return db.suppliers.findOneAsync<Supplier>(companyId, { _id: id });
}

export async function createSupplier(formData: FormData) {
  const companyId = await getActiveCompanyId();
  await db.suppliers.insertAsync<Supplier>(companyId, {
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

/** Admin-only: sets/resets a supplier's portal login. `portalUsername` is globally unique (see the sparse index in db.ts) since the portal login lookup must resolve a supplier before any companyId is known. */
export async function setSupplierPortalCredentials(supplierId: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const username = String(formData.get("portalUsername") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("portalPassword") || "");
  if (!username || !password) return;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await db.suppliers.updateAsync(
      companyId,
      { _id: supplierId },
      { $set: { portalUsername: username, portalPasswordHash: passwordHash, portalActive: true } }
    );
  } catch {
    redirect(
      `/inventory/suppliers?error=${encodeURIComponent("That portal username is already taken — choose another.")}`
    );
  }

  await logAudit(
    companyId,
    session.user.id,
    session.user.name ?? "",
    "set_supplier_portal_credentials",
    "supplier",
    supplierId,
    `Set portal credentials for supplier (username: ${username})`
  );

  revalidatePath("/inventory/suppliers");
}

export async function setSupplierPortalActive(supplierId: string, active: boolean) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  await db.suppliers.updateAsync(companyId, { _id: supplierId }, { $set: { portalActive: active } });
  revalidatePath("/inventory/suppliers");
}

/** Admin-only: puts a supplier on hold — blocks new purchase orders/bills without hiding the record. */
export async function setSupplierSuspended(supplierId: string, suspended: boolean) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const supplier = await db.suppliers.findOneAsync<Supplier>(companyId, { _id: supplierId });
  await db.suppliers.updateAsync(companyId, { _id: supplierId }, { $set: { suspended } });

  if (supplier) {
    await logAudit(
      companyId,
      session.user.id,
      session.user.name ?? "",
      suspended ? "suspend_supplier" : "reactivate_supplier",
      "supplier",
      supplierId,
      `${suspended ? "Suspended" : "Reactivated"} supplier ${supplier.name}`
    );
  }

  revalidatePath("/inventory/suppliers");
}

export async function listPurchaseOrders() {
  const companyId = await getActiveCompanyId();
  return db.purchaseOrders.findAsync<PurchaseOrder>(companyId, {}).sort({ createdAt: -1 });
}

export async function getPurchaseOrder(id: string) {
  const companyId = await getActiveCompanyId();
  return db.purchaseOrders.findOneAsync<PurchaseOrder>(companyId, { _id: id });
}

export async function getPurchaseOrderByNumber(number: string) {
  const companyId = await getActiveCompanyId();
  return db.purchaseOrders.findOneAsync<PurchaseOrder>(companyId, { number });
}

export async function createPurchaseOrder(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const supplierId = String(formData.get("supplierId"));
  const supplier = await db.suppliers.findOneAsync<Supplier>(companyId, { _id: supplierId });
  if (supplier?.suspended) {
    redirect(
      `/inventory/purchase-orders?error=${encodeURIComponent(`${supplier.name} is suspended — reactivate them before creating a new purchase order.`)}`
    );
  }
  const warehouseId = String(formData.get("warehouseId"));
  const date = String(formData.get("date"));
  const items: Array<{ productId: string; productName: string; qty: number; cost: number }> = JSON.parse(
    String(formData.get("items") || "[]")
  );

  const total = items.reduce((s, i) => s + i.qty * i.cost, 0);
  const count = await db.purchaseOrders.countAsync(companyId, {});
  const number = nextNumber("PO", count + 1);

  await db.purchaseOrders.insertAsync<PurchaseOrder>(companyId, {
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

export async function sendPurchaseOrderToSupplier(orderId: string) {
  const companyId = await getActiveCompanyId();
  const order = await db.purchaseOrders.findOneAsync<PurchaseOrder>(companyId, { _id: orderId });
  if (!order || order.status !== "draft") return;

  const session = await auth();
  const approval = await ensureApprovalRequest(
    companyId,
    "purchase_order",
    order._id!,
    order.number,
    session!.user.id,
    session!.user.name ?? ""
  );
  if (approval.status !== "approved") {
    redirect(
      `/inventory/purchase-orders?error=${encodeURIComponent(
        "This purchase order requires admin/accountant approval before it can be sent to the supplier."
      )}`
    );
  }

  await db.purchaseOrders.updateAsync(companyId, { _id: orderId }, { $set: { status: "ordered" } });
  await logAudit(
    companyId,
    session!.user.id,
    session!.user.name ?? "",
    "send_purchase_order",
    "purchase_order",
    orderId,
    `Sent purchase order ${order.number} to supplier`
  );
  revalidatePath("/inventory/purchase-orders");
}

export async function receivePurchaseOrder(orderId: string) {
  const companyId = await getActiveCompanyId();
  const order = await db.purchaseOrders.findOneAsync<PurchaseOrder>(companyId, { _id: orderId });
  if (!order || order.status === "received") return;

  for (const item of order.items) {
    await db.stockMovements.insertAsync<StockMovement>(companyId, {
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
  await db.purchaseOrders.updateAsync(companyId, { _id: orderId }, { $set: { status: "received" } });

  revalidatePath("/inventory/purchase-orders");
  revalidatePath("/inventory/stock");
}
