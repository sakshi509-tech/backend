const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const storeController = require("../controller/storeController");

const router = express.Router();

router.get("/subdomain/:subdomain", storeController.getStoreBySubdomain);
router.get("/me", authMiddleware, storeController.getMyStore);
router.post("/me", authMiddleware, storeController.createOrUpdateStore);
router.get("/me/products", authMiddleware, storeController.getMyStoreProducts);
router.patch("/me/products/:productId", authMiddleware, storeController.updateProductPrice);

module.exports = router;
