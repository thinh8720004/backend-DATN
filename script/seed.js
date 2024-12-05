require("dotenv").config();
const { connectDB } = require("../config/db");

const Admin = require("../models/Admin");
const adminData = require("../utils/admin");

const Customer = require("../models/Customer");
const customerData = require("../utils/customers");

const Product = require("../models/Product");
const productData = require("../utils/products");

const Order = require("../models/Order");
const orderData = require("../utils/orders");

const Category = require("../models/Category");
const categoryData = require("../utils/categories");

const Attribute = require("../models/Attribute");
const attributeData = require("../utils/attributes");

const Setting = require("../models/Setting");
const settingData = require("../utils/settings");

const Supplier = require("../models/Supplier");
const supplierData = require("../utils/suppliers");  // Dữ liệu mẫu cho Supplier

connectDB();

const importData = async () => {
  try {
    // Xóa dữ liệu hiện tại trong các bảng
    await Attribute.deleteMany();
    // await Attribute.insertMany(attributeData);

    await Customer.deleteMany();
    await Customer.insertMany(customerData);

    await Admin.deleteMany();
    await Admin.insertMany(adminData);

    await Category.deleteMany();
    // await Category.insertMany(categoryData);

    await Product.deleteMany();
    // await Product.insertMany(productData);

    await Order.deleteMany();
    // await Order.insertMany(orderData);

    await Setting.deleteMany();
    await Setting.insertMany(settingData);

    // Xóa và thêm dữ liệu cho Supplier (giống Category)
    await Supplier.deleteMany();  // Xóa tất cả dữ liệu cũ trong bảng Supplier
    await Supplier.insertMany(supplierData);  // Thêm dữ liệu mới vào bảng Supplier

    console.log("Data inserted successfully!");
    process.exit();
  } catch (error) {
    console.log("Error", error);
    process.exit(1);
  }
};

importData();
