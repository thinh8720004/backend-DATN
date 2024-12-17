require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("morgan");

const { connectDB } = require("../config/db");
// Rồi
const customerRoutes = require("../routes/customerRoutes");
//Rồi
const adminRoutes = require("../routes/adminRoutes");
//Rồi
const orderRoutes = require("../routes/orderRoutes");

const reviewsRoutes = require('../routes/reviewRoutes');
const customerOrderRoutes = require("../routes/customerOrderRoutes");
///////////////
const cartRoutes = require('../routes/cartRoutes');
const categoryRoutes = require("../routes/categoryRoutes");
const supplierRoutes = require("../routes/supplierRoutes");

const productRoutes = require("../routes/productRoutes");

const contactRoutes = require('../routes/contact')
const homePageRoutes = require("../routes/homepageRoutes");
const settingRoutes = require("../routes/settingRoutes");

connectDB();
const app = express();

// We are using this for the express-rate-limit middleware
// See: https://github.com/nfriedly/express-rate-limit
// app.enable('trust proxy');
// app.set("trust proxy", 1);

app.use(express.json({ }));
app.use(helmet());
app.use(cors());

app.use(logger("dev"));

//root route
app.get("/", (req, res) => {
  res.send("App works properly!");
});

//this for route will need for store front, also for admin dashboard

//Rồi
app.use("/customer/", customerRoutes);
// Rồi 
app.use("/admin/", adminRoutes);
//Rồi
app.use("/order/", customerOrderRoutes);

//admijn
app.use("/orders/", orderRoutes);
//...
app.use("/reviews/", reviewsRoutes);
//////

//if you not use admin dashboard then these two route will not needed.
app.use("/contact/", contactRoutes);
app.use("/products/", productRoutes);
app.use("/category/", categoryRoutes);
app.use("/supplier/", supplierRoutes);
app.use("/cart/", cartRoutes);
app.use("/homepage/", homePageRoutes);
app.use("/setting/", settingRoutes);

// Use express's default error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(400).json({ message: err.message });
});
// app.use(express.urlencoded({ extended: true })); //// Middleware để xử lý x-www-form-urlencoded


const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => console.log(`server running on port ${PORT}`));

app.listen(PORT, () => console.log(`server running on port ${PORT}`));
