const mongoose = require("mongoose");
const Store = require("../models/Store");
const StoreProduct = require("../models/StoreProduct");

const cleanSubdomain = (value) => String(value || "").trim().toLowerCase();

const storeResponse = (store) => ({
  id: store._id,
  storeName: store.storeName,
  subdomain: store.subdomain,
  logo: store.logo,
  theme: store.theme,
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
    const { storeName, subdomain, logo = "", theme = {} } = req.body;
    const normalizedSubdomain = cleanSubdomain(subdomain);
    if (!storeName || !normalizedSubdomain) {
      return res.status(400).json({ success: false, message: "Store name and subdomain are required" });
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalizedSubdomain)) {
      return res.status(400).json({ success: false, message: "Use only lowercase letters, numbers, and hyphens in subdomain" });
    }
    const conflict = await Store.findOne({ subdomain: normalizedSubdomain, owner: { $ne: req.user.id } });
    if (conflict) return res.status(409).json({ success: false, message: "This subdomain is already taken" });

    const store = await Store.findOneAndUpdate(
      { owner: req.user.id },
      {
        owner: req.user.id,
        storeName: String(storeName).trim(),
        subdomain: normalizedSubdomain,
        logo: String(logo || "").trim(),
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
    const subdomain = cleanSubdomain(req.params.subdomain);
    const store = await Store.findOne({ subdomain, isActive: true });
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
    const products = await StoreProduct.find({ store: store._id }).populate("product").sort({ createdAt: -1 });
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
    const selection = await StoreProduct.findOneAndUpdate({ store: store._id, product: req.params.productId }, { sellingPrice }, { new: true, runValidators: true }).populate("product");
    if (!selection) return res.status(404).json({ success: false, message: "Product is not selected in your store" });
    return res.status(200).json({ success: true, selection });
  } catch (error) {
    console.error("ADD STORE PRODUCT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to add product to store" });
  }
};

