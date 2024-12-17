const Order = require("../models/Order");
const Product = require("../models/Product");

const getAllOrders = async (req, res) => {
  // Lấy các tham số truy vấn từ request. tìm name, trình trạng, trang
  const { customerName, status, page, limit, day, startDate, endDate } =
    req.query;

  // Tính toán khoảng thời gian dựa trên tham số "day"
  let date = new Date();
  const today = date.toString(); // Ngày hiện tại
  date.setDate(date.getDate() - Number(day)); // Lùi lại số ngày được chỉ định
  const dateTime = date.toString(); // Ngày sau khi lùi lại

  // Chuyển đổi startDate và endDate thành đối tượng Date
  const start_date = new Date(startDate);
  const end_date = new Date(endDate);

  // Điều chỉnh end_date để bao gồm toàn bộ ngày cuối cùng
  end_date.setHours(23, 59, 59, 999);

  // Tạo đối tượng queryObject để chứa điều kiện tìm kiếm
  const queryObject = {};

  // Nếu không có tham số status, lọc các trạng thái mặc định
  if (!status) {
    queryObject.$or = [
      { status: { $regex: `Pending`, $options: "i" } }, // Trạng thái "Pending"
      { status: { $regex: `Processing`, $options: "i" } }, // Trạng thái "Processing"
      { status: { $regex: `Delivered`, $options: "i" } }, // Trạng thái "Delivered"
      { status: { $regex: `Cancel`, $options: "i" } }, // Trạng thái "Cancel"
    ];
  }

  // Tìm kiếm theo tên khách hàng hoặc mã hóa đơn
  if (customerName) {
    const isNumber = !isNaN(Number(customerName)); // Kiểm tra customerName có phải là số hay không
    queryObject.$or = [
      { "user_info.name": { $regex: `${customerName}`, $options: "i" } }, // Tìm theo tên khách hàng
      ...(isNumber ? [{ invoice: Number(customerName) }] : []), // Tìm theo hóa đơn nếu customerName là số
    ];
  }

  // Nếu tham số day được truyền vào, lọc các đơn hàng theo ngày
  if (day) {
    queryObject.createdAt = { $gte: dateTime, $lte: today }; // Khoảng thời gian từ dateTime đến hôm nay
  }

  // Lọc đơn hàng theo trạng thái nếu có tham số status
  if (status) {
    queryObject.status = { $regex: `${status}`, $options: "i" }; // Tìm theo trạng thái khớp với regex
  }

  // Lọc đơn hàng theo khoảng thời gian updatedAt nếu có startDate và endDate
  if (startDate && endDate) {
    queryObject.updatedAt = {
      $gte: start_date, // Lớn hơn hoặc bằng start_date
      $lte: end_date,   // Nhỏ hơn hoặc bằng end_date (bao gồm cả ngày cuối)
    };
  }

  // Phân trang: tính toán page và limit
  const pages = Number(page) || 1; // Mặc định trang là 1 nếu không truyền
  const limits = Number(limit); // Giới hạn số lượng đơn hàng trên mỗi trang
  const skip = (pages - 1) * limits; // Số lượng đơn hàng cần bỏ qua

  try {
    // Đếm tổng số đơn hàng khớp với điều kiện tìm kiếm
    const totalDoc = await Order.countDocuments(queryObject);

    // Truy vấn đơn hàng từ cơ sở dữ liệu
    const orders = await Order.find(queryObject)
      .select(
        "_id orderId invoice paymentMethod subTotal total user_info discount shippingCost status createdAt updatedAt confirmed paymentStatus"
      ) // Lựa chọn các trường cần thiết
      .sort({ createdAt: -1 }) // Sắp xếp theo ngày tạo mới nhất trước
      .skip(skip) // Bỏ qua số lượng đơn hàng theo phân trang
      .limit(limits); // Giới hạn số lượng đơn hàng trên mỗi trang

    // Trả về kết quả dưới dạng JSON
    res.send({
      orders,     // Danh sách đơn hàng
      limits,     // Giới hạn số lượng đơn hàng
      pages,      // Trang hiện tại
      totalDoc,   // Tổng số đơn hàng khớp với điều kiện
    });
  } catch (err) {
    // Xử lý lỗi và trả về phản hồi lỗi
    res.status(500).send({
      message: err.message, // Nội dung lỗi
      status: false,        // Trạng thái thất bại
    });
  }
};

// Hàm getOrderCustomer dùng để lấy tất cả đơn hàng của một khách hàng dựa trên ID khách hàng
const getOrderCustomer = async (req, res) => {
  try {
    // Truy vấn tất cả đơn hàng của khách hàng có ID tương ứng với req.params.id
    // Sắp xếp các đơn hàng theo thứ tự giảm dần của trường _id (đơn hàng mới nhất sẽ được lấy trước)
    const orders = await Order.find({ user: req.params.id }).sort({ _id: -1 });
    
    // Gửi danh sách các đơn hàng đã tìm được cho client
    res.send(orders);
  } catch (err) {
    // Nếu có lỗi xảy ra, trả về mã lỗi 500 cùng với thông điệp lỗi
    res.status(500).send({
      message: err.message,  // Lỗi chi tiết từ server
      status: false,         // Trạng thái không thành công
    });
  }
};


const getOrderById = async (req, res) => {
  try {
    // Tìm đơn hàng bằng cách sử dụng ID từ tham số URL (req.params.id)
    const order = await Order.findById(req.params.id);
    
    // Gửi đơn hàng về client nếu tìm thấy
    res.send(order);
  } catch (err) {
    // Nếu có lỗi xảy ra, trả về mã lỗi 500 và thông điệp lỗi
    res.status(500).send({
      message: err.message,
      status: false,
    });
  }
};

const updateOrder = async (req, res) => {
  const newStatus = req.body.status;  // Lấy trạng thái mới từ yêu cầu
  try {
    // Tìm đơn hàng hiện tại dựa trên ID
    const order = await Order.findById(req.params.id);

    if (!order) {
      // Nếu không tìm thấy đơn hàng, trả về lỗi 404
      return res.status(404).send({
        message: "Order not found!",
        status: false,
      });
    }

    // Biến lưu trữ trạng thái thanh toán mới
    let newPaymentStatus = order.paymentStatus; // Giữ nguyên giá trị thanh toán hiện tại

    // Nếu trạng thái là "Delivered", cập nhật paymentStatus thành true
    if (newStatus === "Delivered") {
      newPaymentStatus = true;
    } else if (newStatus == "Cancel") {
      // Nếu trạng thái là "Cancel", cập nhật lại số lượng hàng tồn kho
      order.cart.forEach(async (item) => {
        const qty = item.quantity;
        const productId = item?.id?._id;
        if (productId) {
          const product = await Product.findById(productId);
          if (product) {
            // Cập nhật lại số lượng sản phẩm sau khi hủy đơn
            product.stock += qty;
            await product.save();
          }
        }
      });
    } else if (["Pending", "Processing"].includes(newStatus)) {
      // Nếu trạng thái là "Pending" hoặc "Processing", paymentStatus = false
      newPaymentStatus = false;
    }

    // Cập nhật trạng thái đơn hàng và trạng thái thanh toán trong cơ sở dữ liệu
    await Order.updateOne(
      { _id: req.params.id },
      {
        $set: {
          status: newStatus,           // Cập nhật trạng thái đơn hàng
          paymentStatus: newPaymentStatus, // Cập nhật trạng thái thanh toán
        },
      }
    );

    // Trả về thông báo thành công
    res.status(200).send({
      message: "Order Updated Successfully!",
    });
  } catch (err) {
    // Nếu có lỗi, trả về thông báo lỗi với mã 500
    res.status(500).send({
      message: err.message,
      status: false,
    });
  }
};





const deleteOrder = (req, res) => {
  Order.deleteOne({ _id: req.params.id }, (err) => {
    if (err) {
      res.status(500).send({
        message: err.message,
      });
    } else {
      res.status(200).send({
        message: "Order Deleted Successfully!",
      });
    }
  });
};

// get dashboard recent order
const getDashboardRecentOrder = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const queryObject = {};

    queryObject.$or = [
      { status: { $regex: `Pending`, $options: "i" } },
      { status: { $regex: `Processing`, $options: "i" } },
      { status: { $regex: `Delivered`, $options: "i" } },
      { status: { $regex: `Cancel`, $options: "i" } },
    ];

    const totalDoc = await Order.countDocuments(queryObject);

    // query for orders
    const orders = await Order.find(queryObject)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limits);

    // console.log('order------------<', orders);

    res.send({
      orders: orders,
      page: page,
      limit: limit,
      totalOrder: totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get dashboard count
const getDashboardCount = async (req, res) => {
  try {
    const totalDoc = await Order.countDocuments();

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total processing order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total delivered order count
    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    res.send({
      totalOrder: totalDoc,
      totalPendingOrder: totalPendingOrder[0] || 0,
      totalProcessingOrder: totalProcessingOrder[0]?.count || 0,
      totalDeliveredOrder: totalDeliveredOrder[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDashboardAmount = async (req, res) => {
  // console.log('total')
  let week = new Date();
  week.setDate(week.getDate() - 10);
  try {
    // total order amount
    const totalAmount = await Order.aggregate([
      {
        $group: {
          _id: null,
          tAmount: {
            $sum: "$total",
          },
        },
      },
    ]);
    // console.log('totalAmount',totalAmount)
    const thisMonthlyOrderAmount = await Order.aggregate([
      {
        $match: {
          $or: [{ status: { $regex: "Delivered", $options: "i" } }],
          $expr: {
            $eq: [{ $month: "$updatedAt" }, { $month: new Date() }],
          },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $month: "$updatedAt",
            },
          },
          total: {
            $sum: "$total",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    // console.log("thisMonthlyOrderAmount ===>", thisMonthlyOrderAmount);

    // order list last 10 days
    const orderFilteringData = await Order.find(
      {
        $or: [{ status: { $regex: `Delivered`, $options: "i" } }],
        updatedAt: {
          $gte: week,
        },
      },

      {
        paymentMethod: 1,
        paymentDetails: 1,
        total: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    );
    // let data = [];
    // orderFilteringData.map((value) => {
    //   return data.push(value._id);
    // });

    res.send({
      totalAmount:
        totalAmount.length === 0
          ? 0
          : parseFloat(totalAmount[0].tAmount).toFixed(2),
      thisMonthlyOrderAmount: thisMonthlyOrderAmount[0]?.total,
      ordersData: orderFilteringData,
    });
  } catch (err) {
    // console.log('err',err)
    res.status(500).send({
      message: err.message,
    });
  }
};

const bestSellerProductChart = async (req, res) => {
  try {
    const totalDoc = await Order.countDocuments({});
    const bestSellingProduct = await Order.aggregate([
      {
        $unwind: "$cart",
      },
      {
        $group: {
          _id: "$cart.title",

          count: {
            $sum: "$cart.quantity",
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: 4,
      },
    ]);

    res.send({
      totalDoc,
      bestSellingProduct,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDashboardOrders = async (req, res) => {
  const { page, limit } = req.query;

  const pages = Number(page) || 1;
  const limits = Number(limit) || 8;
  const skip = (pages - 1) * limits;

  let week = new Date();
  week.setDate(week.getDate() - 10);

  const start = new Date().toDateString();

  // (startDate = '12:00'),
  //   (endDate = '23:59'),
  // console.log("page, limit", page, limit);

  try {
    const totalDoc = await Order.countDocuments({});

    // query for orders
    const orders = await Order.find({})
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    const totalAmount = await Order.aggregate([
      {
        $group: {
          _id: null,
          tAmount: {
            $sum: "$total",
          },
        },
      },
    ]);

    // total order amount
    const todayOrder = await Order.find({ createdAt: { $gte: start } });

    // this month order amount
    const totalAmountOfThisMonth = await Order.aggregate([
      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },
            month: {
              $month: "$createdAt",
            },
          },
          total: {
            $sum: "$total",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total delivered order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total delivered order count
    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    //weekly sale report
    // filter order data
    const weeklySaleReport = await Order.find({
      $or: [{ status: { $regex: `Delivered`, $options: "i" } }],
      createdAt: {
        $gte: week,
      },
    });

    res.send({
      totalOrder: totalDoc,
      totalAmount:
        totalAmount.length === 0
          ? 0
          : parseFloat(totalAmount[0].tAmount).toFixed(2),
      todayOrder: todayOrder,
      totalAmountOfThisMonth:
        totalAmountOfThisMonth.length === 0
          ? 0
          : parseFloat(totalAmountOfThisMonth[0].total).toFixed(2),
      totalPendingOrder:
        totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0],
      totalProcessingOrder:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      totalDeliveredOrder:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,
      orders,
      weeklySaleReport,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
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
};
