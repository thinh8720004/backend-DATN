const express = require("express");
const router = express.Router();
 
const { isAuth } = require("../config/auth");
const { addReview, getAllProducts } = require("../controller/productController");
const { getAllReviews, deleteReview } = require("../controller/reviewController");

//add a product
router.post("/add", isAuth,addReview);

router.get("/",getAllReviews);
router.delete("/:id", deleteReview);

module.exports = router;
