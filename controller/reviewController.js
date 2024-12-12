const Product = require("../models/Product");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const Review = require("../models/Review");







const getAllReviews = async (req, res) => {
    let { user, product, rating, page, limit, sort } = req.query;
  
    // Default values for pagination and query parameters
    if (!page) {
      page = 1;
    }
    if (!limit) {
      limit = 10;
    }
  
    let queryObject = {};
    let sortObject = {};
  
    // Filtering by user and product
    if (user) {
      queryObject.user = user;
    }
    if (product) {
      queryObject.product = product;
    }
  
    // Filtering by rating
    if (rating) {
      queryObject.rating = Number(rating);
    }
  
    // Sorting logic
    if (sort === "date-added-asc") {
      sortObject.createdAt = 1;
    } else if (sort === "date-added-desc") {
      sortObject.createdAt = -1;
    } else if (sort === "rating-asc") {
      sortObject.rating = 1;
    } else if (sort === "rating-desc") {
      sortObject.rating = -1;
    } else {
      sortObject = { _id: -1 }; // Default sorting by _id in descending order
    }
  
    const pages = Number(page);
    const limits = Number(limit);
    const skip = (pages - 1) * limits;
  
    try {
      // Count total reviews matching the query
      const totalDoc = await Review.countDocuments(queryObject);
  
      // Fetch reviews with pagination, sorting, and optional population
      const reviews = await Review.find(queryObject)
        .populate({ path: "user", select: "_id name" })
        .populate({ path: "product", select: "_id title " })
        .sort(sortObject)
        .skip(skip)
        .limit(limits);
  
      res.send({
        reviews,
        totalDoc,
        limits,
        pages,
      });
    } catch (err) {
      console.log("error", err);
      res.status(500).send({
        message: err.message,
        status: false,
      });
    }
  };
  
  const deleteReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        console.log("Deleted review:", review);

        // Nếu không tìm thấy đánh giá với ID đó
        if (!review) {
            return res.status(404).send({
                message: "Review not found!",
                status: false,
            });
        }

        // Nếu xóa thành công
        res.status(200).send({
            message: "Review Deleted Successfully!",
            status: true,
        });
    } catch (err) {
        // Xử lý lỗi nếu có
        res.status(500).send({
            message: err.message || "Some error occurred while deleting the review.",
            status: false,
        });
    }
};


module.exports = {
//   addProduct,
//   addReview,
//   getProductReviews,
//   addAllProducts,
//   getAllProducts,
//   getShowingProducts,
//   getProductById,
//   getProductBySlug,
//   updateProduct,
//   updateManyProducts,
//   updateStatus,
//   deleteProduct,
//   deleteManyProducts,
//   getShowingStoreProducts,
//   getProductByCategory,
//   getProductBySupplier,
    //   getRelatedProducts,
    deleteReview,
    getAllReviews
};
