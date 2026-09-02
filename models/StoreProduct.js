const mongoose = require("mongoose");

const storeProductSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sellingPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storeProductSchema.index({ store: 1, product: 1 }, { unique: true });

module.exports = mongoose.models.StoreProduct || mongoose.model("StoreProduct", storeProductSchema);
