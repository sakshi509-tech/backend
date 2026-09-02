const express = require("express");
const router = express.Router();
const dropshipperController = require("../controller/dropshipperController");
const dropshipperAuthMiddleware = require("../middleware/dropshipperAuthMiddleware");

// ====================================
// PUBLIC ROUTES
// ====================================

// Register new dropshipper
router.post("/register", dropshipperController.registerDropshipper);

// Verify OTP and set password
router.post("/verify-otp", dropshipperController.verifyOtpAndSetPassword);

// Login dropshipper
router.post("/login", dropshipperController.loginDropshipper);

// Get dropshipper by subdomain (public)
router.get("/subdomain/:subdomain", dropshipperController.getDropshipperBySubdomain);

// ====================================
// PROTECTED ROUTES (Dropshipper only)
// ====================================

// Get dropshipper profile
router.get("/profile", dropshipperAuthMiddleware, dropshipperController.getDropshipperProfile);

// Update dropshipper profile
router.put("/profile/update", dropshipperAuthMiddleware, dropshipperController.updateDropshipperProfile);

// Update dropshipper theme
router.put("/theme/update", dropshipperAuthMiddleware, dropshipperController.updateDropshipperTheme);

// Add product to dropshipper
router.post("/product/add", dropshipperAuthMiddleware, dropshipperController.addProductToDropshipper);

// Remove product from dropshipper
router.post("/product/remove", dropshipperAuthMiddleware, dropshipperController.removeProductFromDropshipper);

// Get dropshipper's products
router.get("/products/:dropshipperId", dropshipperController.getDropshipperProducts);

// ====================================
// ADMIN ROUTES
// ====================================

// Get all dropshippers
router.get("/", dropshipperController.getAllDropshippers);

module.exports = router;
