const mongoose = require("mongoose");
const Cart = require("../models/cart");
const { syncStoreSelections } = require("../services/storeSelectionService");

// =====================================================
// GET CART
// GET /api/cart
// =====================================================

const getCart = async (req, res) => {
  try {
    console.log("=================================");
    console.log("GET CART");
    console.log("REQ.USER:", req.user);
    console.log("=================================");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // authMiddleware se user id nikalo
    const userId =
      req.user._id ||
      req.user.id ||
      req.user.userId ||
      req.user._id?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found",
      });
    }

    // ObjectId validate
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("INVALID USER ID:", userId);

      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    let cart = await Cart.findOne({
      user: userId,
    }).populate({
      path: "items.product",
      select: "name price image stock brand category",
    });

    // Cart nahi hai to create karo
    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
      });

      // Newly created cart populate
      await cart.populate({
        path: "items.product",
        select: "name price image stock brand category",
      });
    }

    const items = cart.items || [];

    const cartCount = items.reduce(
      (total, item) => {
        return total + Number(item.quantity || 0);
      },
      0
    );

    return res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      cart,
      items,
      cartCount,
    });
  } catch (error) {
    console.error("=================================");
    console.error("GET CART ERROR");
    console.error(error);
    console.error("=================================");

    return res.status(500).json({
      success: false,
      message: "Failed to get cart",
      error: error.message,
    });
  }
};

// =====================================================
// ADD TO CART
// POST /api/cart/add
// =====================================================

const addToCart = async (req, res) => {
  try {
    console.log("ADD CART USER:", req.user);
    console.log("ADD CART BODY:", req.body);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId =
      req.user._id ||
      req.user.id ||
      req.user.userId;

    const { productId } = req.body;

    const quantity = Number(req.body.quantity || 1);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    let cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() ===
        productId.toString()
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
      });
    }

    await cart.save();
    await syncStoreSelections(userId, req.user.name);

    await cart.populate({
      path: "items.product",
      select: "name price image stock brand category",
    });

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
      items: cart.items,
    });
  } catch (error) {
    console.error("ADD CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE CART
// PUT /api/cart/update/:productId
// =====================================================

const updateCart = async (req, res) => {
  try {
    console.log("UPDATE CART USER:", req.user);
    console.log("UPDATE CART PARAMS:", req.params);
    console.log("UPDATE CART BODY:", req.body);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId =
      req.user._id ||
      req.user.id ||
      req.user.userId;

    const { productId } = req.params;
    const quantity = Number(req.body.quantity);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.find(
      (item) =>
        item.product.toString() ===
        productId.toString()
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    item.quantity = quantity;

    await cart.save();
    await syncStoreSelections(userId, req.user.name);

    await cart.populate({
      path: "items.product",
      select: "name price image stock brand category",
    });

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      cart,
      items: cart.items,
    });
  } catch (error) {
    console.error("UPDATE CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update cart",
      error: error.message,
    });
  }
};

// =====================================================
// REMOVE FROM CART
// DELETE /api/cart/remove/:productId
// =====================================================

const removeFromCart = async (req, res) => {
  try {
    console.log("REMOVE CART USER:", req.user);
    console.log("REMOVE PRODUCT:", req.params.productId);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId =
      req.user._id ||
      req.user.id ||
      req.user.userId;

    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) =>
        item.product.toString() !==
        productId.toString()
    );

    await cart.save();
    await syncStoreSelections(userId, req.user.name);

    await cart.populate({
      path: "items.product",
      select: "name price image stock brand category",
    });

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart,
      items: cart.items,
    });
  } catch (error) {
    console.error("REMOVE CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove product",
      error: error.message,
    });
  }
};

// =====================================================
// CLEAR CART
// DELETE /api/cart/clear
// =====================================================

const clearCart = async (req, res) => {
  try {
    console.log("CLEAR CART USER:", req.user);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId =
      req.user._id ||
      req.user.id ||
      req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found",
      });
    }

    const cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart already empty",
        items: [],
        cartCount: 0,
      });
    }

    cart.items = [];

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart,
      items: [],
      cartCount: 0,
    });
  } catch (error) {
    console.error("CLEAR CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
};