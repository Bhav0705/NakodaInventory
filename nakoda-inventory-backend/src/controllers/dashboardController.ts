import { Request, Response } from "express";
import Warehouse from "../models/Warehouse";
import Product from "../models/Product";
import GRN from "../models/GRN";          // yahan apna actual model path
import Dispatch from "../models/Dispatch"; // ya Order model jo use kar rahe ho

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      warehouseCount,
      productCount,
      grnTodayCount,
      pendingDispatchCount,
    ] = await Promise.all([
      Warehouse.countDocuments({}),
      Product.countDocuments({}),
      GRN.countDocuments({ createdAt: { $gte: startOfToday } }),
      Dispatch.countDocuments({
        status: { $in: ["pending", "processing"] }, // apne status ke hisaab se
      }),
    ]);

    return res.json({
      success: true,
      data: {
        warehouses: warehouseCount,
        products: productCount,
        grnToday: grnTodayCount,
        pendingDispatch: pendingDispatchCount,
      },
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error loading dashboard" });
  }
};
