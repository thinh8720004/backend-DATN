const express = require('express');
const router = express.Router();
const {
  addSupplier,
  addAllSuppliers,
  getAllSuppliers,
  // getShowingSuppliers,
  getSupplierById,
  updateSupplier,
  // updateStatus,
  deleteSupplier,
  deleteManySuppliers,
  updateManySuppliers
} = require('../controller/supplierController');

// Add a supplier
router.post('/add', addSupplier);

// Add multiple suppliers
router.post('/add/all', addAllSuppliers);

// Get only showing suppliers
// router.get('/show', getShowingSuppliers);

// Get all suppliers
router.get('/', getAllSuppliers);

// Get a supplier by ID
router.get('/:id', getSupplierById);

// Update a supplier
router.put('/:id', updateSupplier);

// Show/hide a supplier
// router.put('/status/:id', updateStatus);

// Delete a single supplier
router.delete('/:id', deleteSupplier);

// Delete multiple suppliers
router.patch('/delete/many', deleteManySuppliers);

// Update multiple suppliers
router.patch('/update/many', updateManySuppliers);

module.exports = router;
