const mongoose = require("mongoose");
const slugify = require("slugify");

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: false, // Nếu cần thì có thể làm bắt buộc
    },
    phone: {
      type: String,
      required: false, // Có thể tùy chọn, nếu cần thì thêm validate
    },
    email: {
      type: String,
      required: false, // Cũng có thể làm bắt buộc nếu cần
    },
    address: {
      type: String,
      required: false, // Cũng có thể tùy chọn
    },
    status: {
      type: String,
      lowercase: true,
      enum: ["active", "inactive"], // Trạng thái chỉ có 2 giá trị: active hoặc inactive
      default: "active",
    },
    slug: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to generate slug before saving
supplierSchema.pre("save", function (next) {
  if (!this.isModified("name")) {
    next();
    return;
  }
  this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});

const Supplier = mongoose.model("Supplier", supplierSchema);
module.exports = Supplier;
