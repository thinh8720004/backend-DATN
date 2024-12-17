const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  getOrderCustomer,
  updateOrder,
  deleteOrder,
  bestSellerProductChart,
  getDashboardOrders,
  getDashboardRecentOrder,
  getDashboardCount,
  getDashboardAmount,
} = require("../controller/orderController");

// Lấy tất cả đơn hàng
router.get("/", getAllOrders);

// Hiển thị các đơn hàng trên trang điều khiển (Dashboard)
router.get("/dashboard", getDashboardOrders);

// Hiển thị các đơn hàng gần đây trên trang điều khiển (Dashboard)
router.get("/dashboard-recent-order", getDashboardRecentOrder);

// Lấy tổng số đơn hàng trên trang điều khiển (Dashboard)
router.get("/dashboard-count", getDashboardCount);

// Lấy tổng giá trị đơn hàng trên trang điều khiển (Dashboard)
router.get("/dashboard-amount", getDashboardAmount);

// Lấy dữ liệu biểu đồ sản phẩm bán chạy nhất
router.get("/best-seller/chart", bestSellerProductChart);

// Lấy tất cả đơn hàng của một khách hàng theo ID
router.get("/customer/:id", getOrderCustomer);

// Lấy thông tin chi tiết của một đơn hàng theo ID
router.get("/:id", getOrderById);

// Cập nhật thông tin của một đơn hàng theo ID
router.put("/:id", updateOrder);

// Xóa một đơn hàng theo ID
router.delete("/:id", deleteOrder);

module.exports = router;
