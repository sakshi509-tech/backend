const Store = require("../models/Store");
const StoreProduct = require("../models/StoreProduct");
const Cart = require("../models/cart");
const Wishlist = require("../models/wishlist");

const makeSubdomain = (name, userId) => {
  const base = String(name || "store")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 45);
  return base || `store-${String(userId).slice(-8)}`;
};

const ensureStore = async (userId, name) => {
  let store = await Store.findOne({ owner: userId });
  if (store) return store;

  let subdomain = makeSubdomain(name, userId);
  const existing = await Store.findOne({ subdomain });
  if (existing) subdomain = `${subdomain}-${String(userId).slice(-6)}`;

  store = await Store.create({
    owner: userId,
    storeName: `${String(name || "My").trim()}'s Store`,
    subdomain,
  });
  return store;
};

const syncStoreSelections = async (userId, name) => {
  const [cart, wishlist] = await Promise.all([
    Cart.findOne({ user: userId }).select("items.product"),
    Wishlist.findOne({ user: userId }).select("products"),
  ]);
  const productIds = new Set([
    ...(cart?.items || []).map((item) => String(item.product)),
    ...(wishlist?.products || []).map((product) => String(product)),
  ]);

  const store = await ensureStore(userId, name);
  await StoreProduct.deleteMany({ store: store._id, product: { $nin: [...productIds] } });
  if (productIds.size) {
    await StoreProduct.bulkWrite(
      [...productIds].map((product) => ({
        updateOne: {
          filter: { store: store._id, product },
          update: { $set: { store: store._id, product, isActive: true } },
          upsert: true,
        },
      }))
    );
  }
  return store;
};

module.exports = { syncStoreSelections };
