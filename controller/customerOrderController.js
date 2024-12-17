require("dotenv").config();
const stripe = require("stripe")(`${process.env.STRIPE_KEY}` || null); /// use hardcoded key if env not work

const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Thư viện tạo ID duy nhất cho đơn hàng
const crypto = require("crypto-js");
const Order = require("../models/Order");
const axios = require("axios");

const { handleProductQuantity } = require("../lib/stock-controller/others");
const { formatAmountForStripe } = require("../lib/stripe/stripe");
const Product = require("../models/Product");
const { removeCart } = require("./cartController");
const Cart = require("../models/Cart");


// Thêm tất cả các thông tin giỏ hàng vào database
// Hàm xử lý thêm đơn hàng mới
const addOrder = async (req, res) => {
  try {
    // Lấy thông tin giỏ hàng từ request body
    const productsInCart = req.body.cart;
    console.log(productsInCart); // Log thông tin giỏ hàng để kiểm tra dữ liệu đầu vào

    // Khởi tạo các biến tính toán tổng giá trị
    let totalPrice = 0; // Tổng giá sau chiết khấu
    let totalOriginalPrice = 0; // Tổng giá gốc (chưa chiết khấu)
    let totalDiscount = 0; // Tổng tiền chiết khấu
    let orderCart = []; // Mảng chứa thông tin các sản phẩm trong đơn hàng

    // Lặp qua từng sản phẩm trong giỏ hàng
    for (let i = 0; i < productsInCart.length; i++) {
      // Tìm thông tin chi tiết sản phẩm trong cơ sở dữ liệu bằng ID
      const productDetails = await Product.findById(
        productsInCart[i].product._id
      );
      console.log(productDetails); // Log thông tin sản phẩm để kiểm tra

      // Tính giá gốc của sản phẩm (số lượng * giá gốc)
      const productOriginalPrice =
        productDetails.prices.originalPrice * productsInCart[i].quantity;

      // Tính giá đã giảm của sản phẩm (số lượng * giá sau giảm)
      const productPrice =
        productDetails.prices.price * productsInCart[i].quantity;

      // Tính tiền chiết khấu cho sản phẩm
      const productDiscount = productOriginalPrice - productPrice;

      // Cộng dồn các giá trị vào tổng đơn hàng
      totalPrice += productPrice;
      totalOriginalPrice += productOriginalPrice;
      totalDiscount += productDiscount;

      // Thêm thông tin sản phẩm vào mảng `orderCart`
      orderCart.push({
        id: productsInCart[i].product, // ID sản phẩm
        quantity: productsInCart[i].quantity, // Số lượng sản phẩm
        price: productPrice, // Tổng giá sau giảm
        originalPrice: productOriginalPrice, // Tổng giá gốc
        discount: productDiscount, // Tổng chiết khấu cho sản phẩm
      });
    }

    // Lấy thông tin thanh toán (billing) từ request body
    const { billing } = req.body;

    // Kiểm tra nếu thiếu thông tin thanh toán
    if (!billing) {
      return res.status(400).json({
        message: "Billing information is required.", // Thông báo lỗi nếu không có thông tin thanh toán
      });
    }

    // Tạo đối tượng đơn hàng mới với các thông tin đã tính toán
    const newOrder = new Order({
      cart: orderCart, // Danh sách sản phẩm trong đơn hàng
      paymentMethod: req.body.selectedPayment, // Phương thức thanh toán được chọn
      subTotal: totalOriginalPrice, // Tổng giá gốc
      user_info: {
        name: `${billing.name}`, // Tên người dùng
        email: billing.email, // Email
        contact: billing.contact, // Số điện thoại
        address: billing.address, // Địa chỉ
        state: billing.state, // Bang/tỉnh
        city: billing.city, // Thành phố
        country: billing.country, // Quốc gia
        zipCode: billing.zipCode, // Mã bưu điện
      },
      guestCheckout: req.body.guestCheckout, // Chế độ thanh toán khách (không cần tài khoản)
      discount: totalDiscount, // Tổng chiết khấu
      total: req.body.totalPrice, // Tổng thanh toán (sau chiết khấu)
      user: req.user._id, // ID người dùng
      confirmed: false, // Đơn hàng chưa được xác nhận
      status: "Pending", // Trạng thái đơn hàng ban đầu là "Pending" (chờ xử lý)
    });

    // Lưu đơn hàng mới vào cơ sở dữ liệu
    const order = await newOrder.save();

    // Xóa tất cả các sản phẩm trong giỏ hàng của người dùng sau khi đặt hàng thành công
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(400).json({ message: "Cart is empty" }); // Thông báo lỗi nếu giỏ hàng trống
    }
    cart.items = []; // Đặt lại danh sách sản phẩm trong giỏ hàng thành rỗng
    cart.totalPrice = 0; // Đặt lại tổng giá giỏ hàng thành 0
    await cart.save(); // Lưu thay đổi vào cơ sở dữ liệu

    // Phản hồi thành công và trả về thông tin đơn hàng
    res.status(201).json({
      order, // Đối tượng đơn hàng đã tạo
      message: "Order created successfully.", // Thông báo thành công
    });

    // Ghi chú: Có thể thêm hàm xử lý giảm số lượng tồn kho sản phẩm tại đây
    // handleProductQuantity(order.cart);

  } catch (err) {
    // Xử lý lỗi nếu có bất kỳ vấn đề nào xảy ra trong quá trình tạo đơn hàng
    console.log(err); // Log lỗi ra console để debug
    res.status(500).json({
      message: err.message, // Phản hồi lỗi với thông báo chi tiết
    });
  }
};


// Hàm thêm thông tin thanh toán vào đơn hàng
const addPaymentDetails = async (req, res) => {
  try {
    // Tìm đơn hàng theo ID từ tham số URL
    const order = await Order.findById(req.params.id);

    // Lấy mã tham chiếu thanh toán (refId) từ request body
    const paymentRefId = req.body.refId;

    // Cập nhật thông tin thanh toán vào đơn hàng
    order.paymentInfoDetails = {
      payment_id: paymentRefId, // Mã thanh toán (refId)
      payment_gateway: "UPI", // Phương thức thanh toán (ở đây là UPI)
      payment_status: "Not Verified", // Trạng thái thanh toán ban đầu là "Chưa xác minh"
      payment_response: "Under Verification", // Phản hồi thanh toán ban đầu là "Đang xác minh"
    };

    // Lưu lại các thay đổi vào đơn hàng
    const updatedOrder = await order.save();

    // Trả về phản hồi thành công với thông báo và đơn hàng đã được cập nhật
    return res.status(200).json({
      message: "Payment details added successfully.", // Thông báo thành công
      order: updatedOrder, // Trả về đơn hàng đã được cập nhật
    });
  } catch (err) {
    // Nếu có lỗi, trả về mã lỗi 500 và thông báo lỗi
    return res.status(500).send({
      message: err.message, // Thông báo lỗi chi tiết
    });
  }
};


// confirm order from admin
// Hàm xác nhận đơn hàng (Admin xác nhận đơn hàng đã được duyệt)
const confirmOrder = async (req, res) => {
  try {
    // Tìm đơn hàng theo ID được truyền qua tham số URL
    const order = await Order.findById(req.params.id);

    // Cập nhật trạng thái đơn hàng là "confirmed" (đã xác nhận)
    order.confirmed = true;

    // Cập nhật trạng thái đơn hàng thành "Processing" (đang xử lý)
    order.status = "Processing";

    // Lưu lại các thay đổi trong đơn hàng
    await order.save();

    // Trả về phản hồi thành công với thông báo xác nhận đơn hàng
    res.status(200).json({
      message: "Order confirmed successfully.", // Thông báo thành công
    });
  } catch (err) {
    // Nếu có lỗi, trả về mã lỗi 500 và thông báo lỗi
    res.status(500).send({
      message: err.message, // Thông báo lỗi
    });
  }
};

// Hàm xác nhận thanh toán (Admin xác nhận thanh toán đã thành công)
const confirmPayment = async (req, res) => {
  try {
    // Tìm đơn hàng theo ID được truyền qua tham số URL
    const order = await Order.findById(req.params.id);

    // Cập nhật trạng thái đơn hàng thành "Delivered" (đã giao hàng)
    order.status = "Delivered";

    // Lưu lại các thay đổi trong đơn hàng
    await order.save();

    // Trả về phản hồi thành công với thông báo xác nhận thanh toán
    res.status(200).json({
      message: "Payment confirmed successfully.", // Thông báo thành công
    });
  } catch (err) {
    // Nếu có lỗi, trả về mã lỗi 500 và thông báo lỗi
    res.status(500).send({
      message: err.message, // Thông báo lỗi
    });
  }
};


//create payment intent for stripe


// get all orders user
// Hàm lấy thông tin đơn hàng của khách hàng (dành cho khách hàng đã đăng nhập)
const getOrderCustomer = async (req, res) => {
  try {
    // Lấy thông tin trang và giới hạn từ query string
    const { page, limit } = req.query;

    // Xử lý giá trị trang (page) và giới hạn (limit)
    const pages = Number(page) || 1; // Nếu không có page, mặc định là 1
    const limits = Number(limit) || 8; // Nếu không có limit, mặc định là 8
    const skip = (pages - 1) * limits; // Tính toán số lượng đơn hàng cần bỏ qua (skip)

    // In thông tin người dùng ra console (debugging)
    console.log(req.user);

    // Lấy tổng số lượng đơn hàng của người dùng
    const totalDoc = await Order.countDocuments({ user: req.user._id });

    // Lấy tổng số tiền và số lượng đơn hàng có trạng thái "Pending" của người dùng
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending", // Trạng thái đơn hàng là "Pending"
          user: new mongoose.Types.ObjectId(req.user._id), // Đảm bảo đơn hàng thuộc về người dùng hiện tại
        },
      },
      {
        $group: {
          _id: null, // Không nhóm theo bất kỳ trường nào
          total: { $sum: "$total" }, // Tính tổng số tiền của các đơn hàng "Pending"
          count: { $sum: 1 }, // Đếm số lượng đơn hàng "Pending"
        },
      },
    ]);

    // Lấy tổng số tiền và số lượng đơn hàng có trạng thái "Processing" của người dùng
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing", // Trạng thái đơn hàng là "Processing"
          user: new mongoose.Types.ObjectId(req.user._id), // Đảm bảo đơn hàng thuộc về người dùng hiện tại
        },
      },
      {
        $group: {
          _id: null, // Không nhóm theo bất kỳ trường nào
          total: { $sum: "$total" }, // Tính tổng số tiền của các đơn hàng "Processing"
          count: { $sum: 1 }, // Đếm số lượng đơn hàng "Processing"
        },
      },
    ]);

    // Lấy tổng số tiền và số lượng đơn hàng có trạng thái "Delivered" của người dùng
    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered", // Trạng thái đơn hàng là "Delivered"
          user: new mongoose.Types.ObjectId(req.user._id), // Đảm bảo đơn hàng thuộc về người dùng hiện tại
        },
      },
      {
        $group: {
          _id: null, // Không nhóm theo bất kỳ trường nào
          total: { $sum: "$total" }, // Tính tổng số tiền của các đơn hàng "Delivered"
          count: { $sum: 1 }, // Đếm số lượng đơn hàng "Delivered"
        },
      },
    ]);

    // Lấy danh sách các đơn hàng của người dùng, phân trang
    const orders = await Order.find({ user: req.user._id })
      .sort({ _id: -1 }) // Sắp xếp theo thứ tự giảm dần của ID (mới nhất trước)
      .skip(skip) // Bỏ qua các đơn hàng đã được xử lý trong các trang trước
      .limit(limits); // Giới hạn số lượng đơn hàng trên mỗi trang

    // Trả về thông tin các đơn hàng cùng với thông tin tổng hợp về các trạng thái đơn hàng
    res.send({
      orders, // Danh sách các đơn hàng của người dùng
      limits, // Giới hạn số lượng đơn hàng trên mỗi trang
      pages, // Trang hiện tại
      pending: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count, // Số lượng đơn hàng "Pending"
      processing: totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count, // Số lượng đơn hàng "Processing"
      delivered: totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count, // Số lượng đơn hàng "Delivered"
      totalDoc, // Tổng số lượng đơn hàng của người dùng
    });
  } catch (err) {
    // Nếu có lỗi, trả về mã lỗi 500 và thông báo lỗi
    res.status(500).send({
      message: err.message,
    });
  }
};

// Hàm lấy thông tin đơn hàng theo ID của người dùng
const getOrderById = async (req, res) => {
  try {
    // Lấy đơn hàng từ cơ sở dữ liệu theo ID từ tham số URL (req.params.id)
    const order = await Order.findById(req.params.id);

    // Trả về thông tin đơn hàng nếu tìm thấy
    res.send(order);
  } catch (err) {
    // Nếu có lỗi trong quá trình tìm kiếm, trả về mã lỗi 500 và thông báo lỗi
    res.status(500).send({
      message: err.message, // Thông báo lỗi chi tiết
    });
  }
};


const paymentWithMomo = async (req, res) => {
  // Lấy thông tin orderId và total từ request body
  const { orderId, total } = req.body;

  // Thông tin tài khoản đối tác MoMo
  var partnerCode = "MOMOBKUN20180529";
  var accessKey = "klm05TvNBzhg7h7j";
  var secretkey = "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa";
  
  // Tạo requestId duy nhất cho mỗi yêu cầu
  var requestId = partnerCode + new Date().getTime();
  var orderInfo = "pay with MoMo"; // Mô tả đơn hàng
  var redirectUrl = "process.env.STORE_URL/shop"; // URL người dùng sẽ được chuyển hướng đến sau khi thanh toán
  var ipnUrl = `${process.env.NGROK_BACKEND_API_URL}/order/callback-with-momo`; // URL để MoMo gọi lại sau khi thanh toán
  var amount = total.toString(); // Tổng số tiền cần thanh toán
  var requestType = "payWithMethod"; // Loại yêu cầu là thanh toán với phương thức MoMo
  var extraData = ""; // Dữ liệu bổ sung (nếu có)

  console.log("Request to MoMo: ", req.body);

  // Tạo chuỗi ký tự rawSignature cho việc tạo chữ ký bảo mật
  var rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType;

  // Tạo chữ ký bảo mật bằng HMAC-SHA256
  const signature = crypto
    .HmacSHA256(rawSignature, secretkey)
    .toString(crypto.enc.Hex);

  // Tạo request body cho yêu cầu thanh toán
  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    accessKey: accessKey,
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: redirectUrl,
    ipnUrl: ipnUrl,
    extraData: extraData,
    requestType: requestType,
    signature: signature,
    lang: "en", // Ngôn ngữ yêu cầu là tiếng Anh
  });

  // Cấu hình yêu cầu axios
  const options = {
    method: "POST",
    url: "https://test-payment.momo.vn/v2/gateway/api/create", // URL của MoMo API
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(requestBody), // Tính độ dài của request body
    },
    data: requestBody, // Gửi request body đã tạo ở trên
  };

  console.log("Request to MoMo: ", options);

  // Gửi yêu cầu đến MoMo API và xử lý phản hồi
  try {
    const result = await axios(options); // Gửi yêu cầu với axios
    if (result.data.resultCode !== 0) {
      // Nếu MoMo trả về mã lỗi, trả về phản hồi lỗi cho client
      return res.status(400).json({
        message: result.data.message,
        data: result.data,
      });
    }
    // Nếu thành công, trả về thông tin thành công cho client
    return res.status(200).json({
      message: "Payment request sent successfully.",
      data: result.data,
    });
  } catch (error) {
    // Nếu có lỗi trong quá trình gửi yêu cầu, trả về lỗi cho client
    return res.status(500).send({
      message: error.message,
    });
  }
};

const callbackPaymentMomo = async (req, res) => {
  console.log("MoMo callback: ", req.body);

  // Lấy thông tin từ callback của MoMo
  const { orderId, resultCode } = req.body;

  // Nếu thanh toán thành công (resultCode === 0)
  if (resultCode === 0) {
    // Cập nhật trạng thái đơn hàng trong cơ sở dữ liệu
    const order = await Order.findById(orderId);
    order.status = "Processing"; // Cập nhật trạng thái đơn hàng thành "Processing"
    order.paymentStatus = true; // Đánh dấu thanh toán đã thành công
    order.confirmed = true; // Đánh dấu đơn hàng đã được xác nhận
    await order.save(); // Lưu đơn hàng đã cập nhật
  }

  // Trả về thông báo đã nhận được callback từ MoMo
  res.status(200).json({ message: "Payment callback received successfully." });
};













//
// Hàm tạo PaymentIntent cho thanh toán Stripe
const createPaymentIntent = async (req, res) => {
  // Lấy thông tin từ request body: tổng số tiền, thông tin thẻ thanh toán và email của người dùng
  const { total: amount, cardInfo: payment_intent, email } = req.body;

  // Kiểm tra tính hợp lệ của số tiền (amount) được gửi từ client
  if (!(amount >= process.env.MIN_AMOUNT && amount <= process.env.MAX_AMOUNT)) {
    // Nếu số tiền không hợp lệ, trả về mã lỗi 500 và thông báo lỗi
    return res.status(500).json({ message: "Invalid amount." });
  }

  // Nếu PaymentIntent đã tồn tại (payment_intent.id có giá trị), thì tiến hành cập nhật
  if (payment_intent.id) {
    try {
      // Lấy thông tin PaymentIntent hiện tại từ Stripe
      const current_intent = await stripe.paymentIntents.retrieve(
        payment_intent.id
      );

      // Nếu PaymentIntent đã được tạo, chỉ cần cập nhật số tiền (amount)
      if (current_intent) {
        const updated_intent = await stripe.paymentIntents.update(
          payment_intent.id, // ID của PaymentIntent cần cập nhật
          {
            amount: formatAmountForStripe(amount, process.env.CURRENCY), // Cập nhật số tiền theo định dạng phù hợp với Stripe
          }
        );
        // Trả về PaymentIntent đã được cập nhật
        return res.send(updated_intent);
      }
    } catch (err) {
      // Nếu có lỗi khác ngoài lỗi "resource_missing", xử lý và trả về thông báo lỗi
      if (err.code !== "resource_missing") {
        const errorMessage =
          err instanceof Error ? err.message : "Internal server error";
        return res.status(500).send({ message: errorMessage });
      }
    }
  }

  try {
    // Nếu PaymentIntent chưa tồn tại, tạo mới PaymentIntent từ các tham số được gửi lên
    const params = {
      amount: formatAmountForStripe(amount, process.env.CURRENCY), // Định dạng số tiền theo yêu cầu của Stripe
      currency: process.env.CURRENCY, // Đơn vị tiền tệ (ví dụ: USD, EUR)
      description: process.env.STRIPE_PAYMENT_DESCRIPTION ?? "", // Mô tả cho thanh toán (nếu có)
      automatic_payment_methods: {
        enabled: true, // Bật phương thức thanh toán tự động
      },
    };

    // Tạo PaymentIntent mới với các tham số trên
    const payment_intent = await stripe.paymentIntents.create(params);

    // Trả về PaymentIntent vừa tạo
    res.send(payment_intent);
  } catch (err) {
    // Nếu có lỗi, trả về mã lỗi 500 và thông báo lỗi
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    res.status(500).send({ message: errorMessage });
  }
};


module.exports = {
  addOrder,
  getOrderById,
  getOrderCustomer,
  createPaymentIntent,
  confirmOrder,
  confirmPayment,
  addPaymentDetails,
  paymentWithMomo,
  callbackPaymentMomo,
};
