const Supplier = require("../models/Supplier");

// Add a single supplier
const addSupplier = async (req, res) => {
  try {
    // Lấy dữ liệu từ body
    const { name, image, phone, email, address, status } = req.body;

    // Tạo mới một nhà cung cấp
    const newSupplier = new Supplier({
      name,
      image,
      phone,
      email,
      address,
      status,
    });

    // Lưu nhà cung cấp vào cơ sở dữ liệu
    await newSupplier.save();
    res.status(200).send({
      message: "Supplier Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Add multiple suppliers
const addAllSuppliers = async (req, res) => {
  try {
    // Xóa tất cả các nhà cung cấp trước đó nếu có
    await Supplier.deleteMany();

    // Thêm nhiều nhà cung cấp mới
    await Supplier.insertMany(req.body);
    res.status(200).send({
      message: "Suppliers Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ _id: -1 });
    res.send(suppliers);
  } catch (err) {
    res.status(500).send({
      message: err.message,
      status: false,
    });
  }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (supplier) {
      res.send(supplier);
    } else {
      res.status(404).send({ message: "Supplier not found!" });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
      status: false,
    });
  }
};

// Update a single supplier
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (supplier) {
      // Cập nhật các trường nếu có trong body request
      supplier.name = req.body.name || supplier.name;
      supplier.image = req.body.image || supplier.image;
      supplier.phone = req.body.phone || supplier.phone;
      supplier.email = req.body.email || supplier.email;
      supplier.address = req.body.address || supplier.address;
      supplier.status = req.body.status || supplier.status;

      // Lưu lại nhà cung cấp đã được cập nhật
      await supplier.save();
      res.send({ message: "Supplier Updated Successfully!" });
    } else {
      res.status(404).send({ message: "Supplier not found!" });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Update multiple suppliers
const updateManySuppliers = async (req, res) => {
  try {
    const updatedData = {};
    // Kiểm tra các trường cần cập nhật
    for (const key of Object.keys(req.body)) {
      if (req.body[key] !== "[]" && Object.entries(req.body[key]).length > 0 && req.body[key] !== req.body.ids) {
        updatedData[key] = req.body[key];
      }
    }

    // Cập nhật nhiều nhà cung cấp cùng lúc
    await Supplier.updateMany(
      { _id: { $in: req.body.ids } },
      { $set: updatedData },
      { multi: true }
    );

    res.send({
      message: "Suppliers Updated Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Delete a single supplier
const deleteSupplier = async (req, res) => {
  try {
    await Supplier.deleteOne({ _id: req.params.id });
    res.status(200).send({
      message: "Supplier Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Delete multiple suppliers
const deleteManySuppliers = async (req, res) => {
  try {
    await Supplier.deleteMany({ _id: { $in: req.body.ids } });
    res.status(200).send({
      message: "Suppliers Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addSupplier,
  addAllSuppliers,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  updateManySuppliers,
  deleteSupplier,
  deleteManySuppliers,
};
