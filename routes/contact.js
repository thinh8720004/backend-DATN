const express = require("express");
const router = express.Router();
// const {
//   registerCustomer,
 
// } = require("../controller/customerController");
const { contact } = require("../controller/contact");



router.post("/", contact);



module.exports = router;
