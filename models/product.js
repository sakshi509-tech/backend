const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    salePrice: {
      type: Number,
      default: null,
      min: 0,
    },

    // Dropshipper Reference (if product belongs to a dropshipper)
    dropshipper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dropshipper",
      default: null,
    },

    // Supplier Reference for supplier-based products
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },

    featured: {
      type: Boolean,
      default: false,
    },

    newArrival: {
      type: Boolean,
      default: false,
    },

    bestSeller: {
      type: Boolean,
      default: false,
    },

    // ===============================
    // DROPSHIPPING
    // ===============================

    isDropshipping: {
      type: Boolean,
      default: false,
    },

    supplierName: {
      type: String,
      default: "",
      trim: true,
    },

    supplierProductId: {
      type: String,
      default: "",
      trim: true,
    },

    supplierUrl: {
      type: String,
      default: "",
      trim: true,
    },

    supplierPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ===============================
// INDEXES
// ===============================

productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
});

productSchema.index({
  category: 1,
});

productSchema.index({
  isDropshipping: 1,
});

productSchema.index({
  isActive: 1,
});

productSchema.index({
  featured: 1,
});

productSchema.index({
  newArrival: 1,
});

productSchema.index({
  bestSeller: 1,
});

module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);