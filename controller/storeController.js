const mongoose = require("mongoose");
const Store = require("../models/Store");
const StoreProduct = require("../models/StoreProduct");
const { normalizeUrlLikeName } = require("../utils/urlFormat");

const cleanSubdomain = (value) => String(value || "").trim().toLowerCase();
const storeUrlFor = (slug) => `https://${slug}.${process.env.STORE_ROOT_DOMAIN || "frontend-q.com"}`;

const storeResponse = (store) => ({
  id: store._id,
  storeName: store.storeName,
  username: store.username,
  subdomain: store.subdomain,
  storeSlug: store.storeSlug,
  storeUrl: store.storeUrl || storeUrlFor(store.storeSlug || store.subdomain),
  logo: store.logo,
  banner: store.banner,
  themeKey: store.themeKey,
  theme: store.theme,
  status: store.status || (store.isActive ? "active" : "inactive"),
  isActive: store.isActive,
});

exports.getMyStore = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.id });
    return res.json({ success: true, store: store ? storeResponse(store) : null });
  } catch (error) {
    console.error("GET MY STORE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load store" });
  }
};

exports.createOrUpdateStore = async (req, res) => {
  try {
    const { username, storeName, storeSlug, subdomain, logo = "", banner = "", themeKey = "modern", theme = {} } = req.body;
    const normalizedStoreName = normalizeUrlLikeName(storeName);
    const normalizedSlug = cleanSubdomain(storeSlug || subdomain || username || req.user.name);
    const normalizedUsername = cleanSubdomain(username || req.user.name || normalizedSlug);
    if (!normalizedStoreName || !normalizedSlug || !normalizedUsername) {
      return res.status(400).json({ success: false, message: "Username, store name, and store slug are required" });
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalizedSlug)) {
      return res.status(400).json({ success: false, message: "Use only lowercase letters, numbers, and hyphens in subdomain" });
    }
    const conflict = await Store.findOne({ $or: [{ storeSlug: normalizedSlug }, { subdomain: normalizedSlug }], owner: { $ne: req.user.id } });
    if (conflict) return res.status(409).json({ success: false, message: "This subdomain is already taken" });

    const store = await Store.findOneAndUpdate(
      { owner: req.user.id },
      {
        owner: req.user.id,
        storeName: normalizedStoreName,
        username: normalizedUsername,
        subdomain: normalizedSlug,
        storeSlug: normalizedSlug,
        storeUrl: storeUrlFor(normalizedSlug),
        logo: String(logo || "").trim(),
        banner: String(banner || "").trim(),
        themeKey: String(themeKey || "modern").trim(),
        theme: {
          primaryColor: theme.primaryColor || "#2563eb",
          secondaryColor: theme.secondaryColor || "#0f172a",
          accentColor: theme.accentColor || "#f59e0b",
          backgroundColor: theme.backgroundColor || "#f8fafc",
          textColor: theme.textColor || "#0f172a",
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ success: true, store: storeResponse(store) });
  } catch (error) {
    console.error("SAVE STORE ERROR:", error);
    return res.status(error.code === 11000 ? 409 : 500).json({ success: false, message: error.code === 11000 ? "This subdomain is already taken" : "Failed to save store" });
  }
};

exports.getStoreBySubdomain = async (req, res) => {
  try {
    const subdomain = cleanSubdomain(req.params.subdomain || req.params.slug);
    const store = await Store.findOne({ $or: [{ storeSlug: subdomain }, { subdomain }], isActive: true, status: { $ne: "inactive" } });
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });
    const selections = await StoreProduct.find({ store: store._id, isActive: true })
      .populate({ path: "product", match: { isActive: true }, populate: { path: "category", select: "name slug image" } })
      .sort({ createdAt: -1 });
    return res.json({ success: true, store: storeResponse(store), products: selections.filter((item) => item.product) });
  } catch (error) {
    console.error("GET STORE BY SUBDOMAIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load store" });
  }
};

exports.getMyStoreProducts = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.id });
    if (!store) return res.json({ success: true, products: [] });
    const products = await StoreProduct.find({ store: store._id, isActive: true }).populate("product").sort({ createdAt: -1 });
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load selected products" });
  }
};

exports.updateProductPrice = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) return res.status(400).json({ success: false, message: "Invalid product ID" });
    const store = await Store.findOne({ owner: req.user.id });
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });
    const sellingPrice = req.body.sellingPrice === "" || req.body.sellingPrice === undefined ? null : Number(req.body.sellingPrice);
    if (sellingPrice !== null && (!Number.isFinite(sellingPrice) || sellingPrice < 0)) return res.status(400).json({ success: false, message: "Selling price must be a positive number" });
    const update = { sellingPrice };
    if (typeof req.body.isActive === "boolean") update.isActive = req.body.isActive;
    const selection = await StoreProduct.findOneAndUpdate({ store: store._id, product: req.params.productId }, update, { new: true, runValidators: true }).populate("product");
    if (!selection) return res.status(404).json({ success: false, message: "Product is not selected in your store" });
    return res.status(200).json({ success: true, selection });
  } catch (error) {
    console.error("ADD STORE PRODUCT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to add product to store" });
  }
};

exports.addProductToMyStore = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.body.productId)) return res.status(400).json({ success: false, message: "Invalid product ID" });
    const store = await Store.findOne({ owner: req.user.id, isActive: true });
    if (!store) return res.status(404).json({ success: false, message: "Create your store first" });
    const selection = await StoreProduct.findOneAndUpdate(
      { store: store._id, product: req.body.productId },
      { $set: { isActive: true, sellingPrice: req.body.sellingPrice ?? null } },
      { new: true, upsert: true, runValidators: true }
    ).populate("product");
    return res.status(201).json({ success: true, selection });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 500).json({ success: false, message: error.code === 11000 ? "Product is already in your store" : "Failed to add product to store" });
  }
};

exports.removeProductFromMyStore = async (req, res) => {
  const store = await Store.findOne({ owner: req.user.id });
  if (!store) return res.status(404).json({ success: false, message: "Store not found" });
  const result = await StoreProduct.deleteOne({ store: store._id, product: req.params.productId });
  if (!result.deletedCount) return res.status(404).json({ success: false, message: "Product is not in your store" });
  return res.json({ success: true, message: "Product removed from your store" });
};

