const Wishlist = require("../models/wishlist");
const Product = require("../models/product");

// ======================================
// GET WISHLIST
// ======================================

const getWishlist = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    let wishlist = await Wishlist.findOne({
      user: userId,
    }).populate({
      path: "products",
      select:
        "name slug image images price salePrice stock category brand",
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: userId,
        products: [],
      });
    }

    res.json({
      success: true,
      wishlist,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to get wishlist",
    });
  }
};

// ======================================
// ADD TO WISHLIST
// ======================================

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let wishlist = await Wishlist.findOne({
      user: userId,
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: userId,
        products: [],
      });
    }

    const alreadyExists =
      wishlist.products.some(
        (id) =>
          id.toString() === productId
      );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    wishlist.products.push(productId);

    await wishlist.save();

    await wishlist.populate({
      path: "products",
      select:
        "name slug image images price salePrice stock category brand",
    });

    res.json({
      success: true,
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist",
    });
  }
};

// ======================================
// REMOVE FROM WISHLIST
// ======================================

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?._id || req.user?.id;

    const wishlist = await Wishlist.findOne({
      user: userId,
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    wishlist.products =
      wishlist.products.filter(
        (id) =>
          id.toString() !== productId
      );

    await wishlist.save();

    await wishlist.populate({
      path: "products",
      select:
        "name slug image images price salePrice stock category brand",
    });

    res.json({
      success: true,
      message: "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message:
        "Failed to remove product from wishlist",
    });
  }
};

// ======================================
// CLEAR WISHLIST
// ======================================

const clearWishlist = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const wishlist = await Wishlist.findOne({
      user: userId,
    });

    if (!wishlist) {
      return res.json({
        success: true,
        message: "Wishlist already empty",
      });
    }

    wishlist.products = [];

    await wishlist.save();

    res.json({
      success: true,
      message: "Wishlist cleared successfully",
      wishlist,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to clear wishlist",
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};