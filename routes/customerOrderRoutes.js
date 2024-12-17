const express = require("express");
const router = express.Router();
const {
  addOrder,
  getOrderById,
  getOrderCustomer,
  createPaymentIntent,
  confirmOrder,
  confirmPayment,
  addPaymentDetails,
  paymentWithMomo,
  callbackPaymentMomo,
} = require("../controller/customerOrderController");
const { guestAuth, isAuth } = require("../config/auth");



// Route để thêm đơn hàng cho người dùng đã đăng nhập.
// Khi người dùng đã đăng nhập và thực hiện thanh toán, đơn hàng sẽ được tạo và lưu trữ.
router.post("/add", isAuth, addOrder);

// Route để thêm thông tin thanh toán vào đơn hàng theo ID.
// Dùng để cập nhật chi tiết thanh toán (như ID giao dịch) vào đơn hàng đã tạo.
router.post("/add-payment-details/:id", addPaymentDetails);

// Route để lấy thông tin đơn hàng theo ID.
// Dùng để truy vấn đơn hàng theo ID của đơn hàng đã tạo và trả về thông tin chi tiết của đơn hàng.
router.get("/:id", isAuth, getOrderById);

// Route để thực hiện thanh toán qua MoMo.
// Khi người dùng chọn thanh toán bằng MoMo, sẽ gửi yêu cầu thanh toán tới MoMo API.
router.post("/payment-momo", paymentWithMomo);

// Route để nhận callback từ MoMo sau khi thanh toán hoàn tất.
// MoMo sẽ gửi kết quả thanh toán (thành công hay thất bại) về qua callback URL này.
router.post("/callback-with-momo", callbackPaymentMomo);

// Route để lấy tất cả đơn hàng của người dùng đã đăng nhập.
// Trả về danh sách các đơn hàng của người dùng, hỗ trợ phân trang (page, limit).
router.get("/", isAuth, getOrderCustomer);

// Route để xác nhận đơn hàng đã được xác nhận (admin hoặc hệ thống có thể xác nhận).
// Thường dùng khi đơn hàng đã được xử lý và xác nhận bắt đầu chuyển sang trạng thái "Processing".
router.post("/confirm-order/:id", confirmOrder);

// Route để xác nhận thanh toán cho đơn hàng.
// Dùng để xác nhận rằng thanh toán đã thành công, sau đó thay đổi trạng thái đơn hàng thành "Delivered".
router.post("/confirm-payment/:id", confirmPayment);









//add a order
// Route để thêm đơn hàng cho khách hàng chưa đăng nhập (guest).
// Khi khách hàng thực hiện thanh toán mà chưa đăng nhập, đơn hàng sẽ được thêm vào.
router.post("/guest-add", guestAuth, addOrder);





// Route để tạo Stripe PaymentIntent, dùng để chuẩn bị thanh toán qua Stripe.
// Đoạn mã này xử lý việc tạo intent thanh toán và trả về các thông tin cần thiết để thực hiện thanh toán.
router.post("/create-payment-intent", createPaymentIntent);
module.exports = router;
