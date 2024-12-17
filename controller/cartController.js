const Product = require("../models/Product");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Cart = require("../models/Cart");

// thêm sản phẩm vào cart
const addTocart = async (req, res) => {
  const { productId, variant, quantity, price } = req.body;
  const userId = req.user._id;
  // console.log("variant", variant);
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({ message: "Không tìm thấy sản phẩm" });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ message: "Không đủ hàng" });
    }
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [], totalPrice: 0 });
    }
    // const itemIndex = cart.items.findIndex(
    //   (item) =>
    //     item.product.toString() === productId &&
    //     JSON.stringify(item.variant) === JSON.stringify(variant)
    // );
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId 
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, variant, quantity });
    }
    const pr =
      Number.parseInt(product.prices.price) ||
      Number.parseInt(product.prices.originalPrice);
    cart.totalPrice += pr * quantity;
    product.stock -= quantity;
    await product.save();
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//in ra sản phẩm
const getCart = async (req, res) => {
  const userId = req.user._id;
  try {
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      model: "Product",
    });

    if (!cart) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }
    res.status(200).json(cart);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

const removeCart = async (req, res) => {
  const userId = req.user._id;
  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//xoá 1 sản phẩm
const removeItem = async (req, res) => {
  const userId = req.user._id;
  const { itemId } = req.body;
  try {
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      model: "Product",
    });
    if (!cart) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    console.log(itemIndex);
    if (itemIndex > -1) {
      const product = await Product.findById(cart.items[itemIndex].product._id);
      product.stock += cart.items[itemIndex].quantity;
      cart.totalPrice -=
        product.prices.price ||
        product.prices.originalPrice * cart.items[itemIndex].quantity;
      cart.items.splice(itemIndex, 1);
      await product.save();
    }
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

// tăng hoặc giảm số lượng
const updateCartQuantity = async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "prices stock",
    });

    if (!cart) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product._id.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(400).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }
    const previousQuantity = cart.items[itemIndex].quantity;
    const quantityDifference = quantity - previousQuantity;

    const product = await Product.findById(productId).session(session);
    if (!product || quantity > product.stock ) {
      return res.status(400).json({ message: "Không đủ hàng" });
    }

    const currentPrice =
      product.prices.price && product.prices.price > 0
        ? product.prices.price
        : product.prices.originalPrice;

    const updatePrice =
      currentPrice * quantity -
      currentPrice * cart.items[itemIndex].quantity;

    cart.totalPrice += updatePrice;
    cart.items[itemIndex].quantity = quantity;

    product.stock -= quantityDifference;

    await product.save({ session });
    await cart.save({ session });
    await session.commitTransaction();
    const cartLatest = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      model: "Product",
    });
    res.status(200).json(cartLatest);
  } catch (error) {
    await session.abortTransaction();
    console.error(`Error updating cart: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    session.endSession();
  }
};


module.exports = {
  addTocart,
  getCart,
  removeCart,
  removeItem,
  updateCartQuantity,
};
