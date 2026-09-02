const express = require("express");

const router = express.Router();

const {
  createProduct,
  submitProduct,
  getMyProducts,
  approveProduct,
  createMultipleProducts,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} = require("../controller/productcontroller");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");

// =====================================================
// CREATE SINGLE PRODUCT
// =====================================================

router.post(
  "/create",
  createProduct
);

router.post(
  "/submit",
  authMiddleware,
  upload.single("image"),
  submitProduct
);
router.get("/mine", authMiddleware, getMyProducts);
router.patch("/approve/:id", authMiddleware, adminMiddleware, approveProduct);

// =====================================================
// CREATE MULTIPLE PRODUCTS
// =====================================================

router.post(
  "/create-multiple",
  authMiddleware,
  adminMiddleware,
  createMultipleProducts
);

// =====================================================
// GET ALL PRODUCTS
// =====================================================

router.get(
  "/all",
  getAllProducts
);

// =====================================================
// GET SINGLE PRODUCT
// =====================================================

router.get(
  "/single/:id",
  getSingleProduct
);

// =====================================================
// UPDATE PRODUCT
// =====================================================

router.put(
  "/update/:id",
  updateProduct
);

// =====================================================
// DELETE PRODUCT
// =====================================================

router.delete(
  "/delete/:id",
  deleteProduct
);

// =====================================================
// TOGGLE ACTIVE / INACTIVE
// =====================================================

router.patch(
  "/toggle/:id",
  toggleProductStatus
);

module.exports = router;