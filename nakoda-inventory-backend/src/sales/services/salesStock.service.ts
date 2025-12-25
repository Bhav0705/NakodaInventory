import mongoose from "mongoose";
import StockLevel from "../../models/StockLevel";
import StockMovement from "../../models/StockMovement";
import SalesInvoice from "../models/SalesInvoice";

export async function applySaleInvoiceStockOut(params: {
  invoiceId: string;
  approvedBy: string; // userId
}) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const invoice = await SalesInvoice.findById(params.invoiceId).session(session);
    if (!invoice) throw new Error("SalesInvoice not found");

    if (invoice.status !== "DRAFT") {
      throw new Error("Only DRAFT invoice can be approved");
    }

    // Stock check + deduct
    for (const line of invoice.items) {
      const warehouseId = invoice.warehouseId;
      const productId = line.productId;
      const qty = Number(line.quantity || 0);

      if (qty <= 0) throw new Error("Invalid sale quantity");

      // ensure stock row exists
      const stock = await StockLevel.findOneAndUpdate(
        { warehouseId, productId },
        { $setOnInsert: { quantity: 0 } },
        { new: true, upsert: true, session }
      );

      if (!stock) throw new Error("StockLevel upsert failed");

      if (stock.quantity < qty) {
        throw new Error(`Insufficient stock for product ${productId.toString()} in warehouse ${warehouseId.toString()}`);
      }

      stock.quantity = stock.quantity - qty;
      await stock.save({ session });

      await StockMovement.create(
        [
          {
            transactionType: "SALE",
            transactionId: invoice._id,
            direction: "OUT",
            warehouseId,
            productId,
            quantityBase: qty,
            createdBy: invoice.createdBy,
            approvedBy: params.approvedBy,
            timestamp: new Date(),
            notes: `Sales invoice ${invoice.invoiceNo}`,
          },
        ],
        { session }
      );
    }

    // Mark invoice approved
    invoice.status = "APPROVED";
    invoice.approvedBy = new mongoose.Types.ObjectId(params.approvedBy) as any;
    await invoice.save({ session });

    await session.commitTransaction();
    return invoice;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
