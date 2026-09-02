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