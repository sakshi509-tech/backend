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
    username: { type: String, required: true, lowercase: true, trim: true, index: true },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    },
    storeSlug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true, match: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/ },
    storeUrl: { type: String, default: "" },
    logo: { type: String, default: "" },
    banner: { type: String, default: "" },
    themeKey: { type: String, default: "modern" },
    theme: {
      primaryColor: { type: String, default: "#2563eb" },
      secondaryColor: { type: String, default: "#0f172a" },
      accentColor: { type: String, default: "#f59e0b" },
      backgroundColor: { type: String, default: "#f8fafc" },
      textColor: { type: String, default: "#0f172a" },
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Store || mongoose.model("Store", storeSchema);
