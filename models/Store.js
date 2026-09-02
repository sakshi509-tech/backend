const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    },
    logo: { type: String, default: "" },
    theme: {
      primaryColor: { type: String, default: "#2563eb" },
      secondaryColor: { type: String, default: "#0f172a" },
      accentColor: { type: String, default: "#f59e0b" },
      backgroundColor: { type: String, default: "#f8fafc" },
      textColor: { type: String, default: "#0f172a" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Store || mongoose.model("Store", storeSchema);
