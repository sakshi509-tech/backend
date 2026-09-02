const User = require("../models/User");
const Product = require("../models/product");
const Category = require("../models/category");

// =====================================================
// OPTIONAL MODELS
// =====================================================

let Cart = null;
let Wishlist = null;
let Address = null;
let Order = null;


try {
  Cart = require("../models/cart");
} catch (error) {
  console.log("Cart model not found");
}

try {
  Wishlist = require("../models/wishlist");
} catch (error) {
  console.log("Wishlist model not found");
}

try {
  Address = require("../models/Address");
} catch (error) {
  console.log("Address model not found");
}

try {
  Order = require("../models/Order");
} catch (error) {
  console.log("Order model not found");
}


// =====================================================
// ADMIN DASHBOARD
// =====================================================

const getAdminDashboard = async (req, res) => {
  try {
    console.log("ADMIN DASHBOARD USER:", req.user);

    // =================================================
    // USERS
    // =================================================

    const totalUsers = await User.countDocuments({
      role: "user",
    });

    const totalAdmins = await User.countDocuments({
      role: "admin",
    });

    const totalAllUsers = await User.countDocuments();

    // =================================================
    // PRODUCTS
    // =================================================

    const totalProducts = await Product.countDocuments();

    let activeProducts = 0;
    let featuredProducts = 0;
    let newArrivalProducts = 0;
    let bestSellerProducts = 0;

    try {
      activeProducts = await Product.countDocuments({
        $or: [
          { active: true },
          { isActive: true },
        ],
      });
    } catch (error) {
      activeProducts = totalProducts;
    }

    try {
      featuredProducts = await Product.countDocuments({
        $or: [
          { featured: true },
          { isFeatured: true },
        ],
      });
    } catch (error) {
      featuredProducts = 0;
    }

    try {
      newArrivalProducts =
        await Product.countDocuments({
          $or: [
            { newArrival: true },
            { isNewArrival: true },
          ],
        });
    } catch (error) {
      newArrivalProducts = 0;
    }

    try {
      bestSellerProducts =
        await Product.countDocuments({
          $or: [
            { bestSeller: true },
            { isBestSeller: true },
          ],
        });
    } catch (error) {
      bestSellerProducts = 0;
    }

    // =================================================
    // CATEGORIES
    // =================================================

    const totalCategories =
      await Category.countDocuments();

    // =================================================
    // CART
    // =================================================

    let totalCartItems = 0;
    let totalCarts = 0;

    if (Cart) {
      totalCarts = await Cart.countDocuments();

      try {
        const cartResult = await Cart.aggregate([
          {
            $unwind: {
              path: "$items",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: null,
              totalItems: {
                $sum: {
                  $ifNull: ["$items.quantity", 0],
                },
              },
            },
          },
        ]);

        totalCartItems =
          cartResult[0]?.totalItems || 0;
      } catch (error) {
        totalCartItems = 0;
      }
    }

    // =================================================
    // WISHLIST
    // =================================================

    let totalWishlistItems = 0;
    let totalWishlists = 0;

    if (Wishlist) {
      totalWishlists =
        await Wishlist.countDocuments();

      try {
        const wishlistResult =
          await Wishlist.aggregate([
            {
              $unwind: {
                path: "$products",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: null,
                totalItems: {
                  $sum: 1,
                },
              },
            },
          ]);

        totalWishlistItems =
          wishlistResult[0]?.totalItems || 0;
      } catch (error) {
        totalWishlistItems = 0;
      }
    }

    // =================================================
    // ADDRESSES
    // =================================================

    let totalAddresses = 0;

    if (Address) {
      totalAddresses =
        await Address.countDocuments();
    }

    // =================================================
    // ORDERS
    // =================================================

    let totalOrders = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let totalRevenue = 0;
    let recentOrders = [];

    if (Order) {
      totalOrders =
        await Order.countDocuments();

      pendingOrders =
        await Order.countDocuments({
          status: "pending",
        });

      deliveredOrders =
        await Order.countDocuments({
          status: "delivered",
        });

      cancelledOrders =
        await Order.countDocuments({
          status: "cancelled",
        });

      // Revenue
      try {
        const revenueResult =
          await Order.aggregate([
            {
              $match: {
                status: {
                  $ne: "cancelled",
                },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $ifNull: [
                      "$totalAmount",
                      0,
                    ],
                  },
                },
              },
            },
          ]);

        totalRevenue =
          revenueResult[0]?.total || 0;
      } catch (error) {
        totalRevenue = 0;
      }

      // Recent orders
      recentOrders =
        await Order.find()
          .sort({
            createdAt: -1,
          })
          .limit(5)
          .lean();
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      message:
        "Dashboard data fetched successfully",

      dashboard: {
        // USERS
        users: {
          total: totalAllUsers,
          users: totalUsers,
          admins: totalAdmins,
        },

        // PRODUCTS
        products: {
          total: totalProducts,
          active: activeProducts,
          featured: featuredProducts,
          newArrival:
            newArrivalProducts,
          bestSeller:
            bestSellerProducts,
        },

        // CATEGORIES
        categories: {
          total: totalCategories,
        },

        // CART
        cart: {
          totalItems: totalCartItems,
          totalCarts: totalCarts,
        },

        // WISHLIST
        wishlist: {
          totalItems:
            totalWishlistItems,
          totalWishlists:
            totalWishlists,
        },

        // ADDRESSES
        addresses: {
          total: totalAddresses,
        },

        // ORDERS
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        recentOrders,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN DASHBOARD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch dashboard",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getAdminDashboard,
};