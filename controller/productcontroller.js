const mongoose = require("mongoose");

const Product = require("../models/product");
const Category = require("../models/category");
const Store = require("../models/Store");
const StoreProduct = require("../models/StoreProduct");

// =====================================================
// CREATE SLUG
// =====================================================

const createSlug = (name) => {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

// =====================================================
// UNIQUE SLUG
// =====================================================

const getUniqueSlug = async (
  name,
  excludeId = null
) => {
  const baseSlug =
    createSlug(name) || "product";

  let slug = baseSlug;
  let count = 1;

  while (true) {
    const query = {
      slug,
    };

    if (excludeId) {
      query._id = {
        $ne: excludeId,
      };
    }

    const exists =
      await Product.findOne(query);

    if (!exists) {
      return slug;
    }

    slug =
      `${baseSlug}-${count}`;

    count++;
  }
};

// =====================================================
// BOOLEAN HELPER
// =====================================================

const toBoolean = (value) => {
  if (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  return false;
};

// =====================================================
// VALIDATE SUPPLIER
// =====================================================

const validateSupplier = async (
  supplierId,
  isDropshipping,
  supplierPrice,
  allowExternalSupplier = false
) => {
  const dropshipping =
    toBoolean(isDropshipping);

  if (!dropshipping) {
    return {
      error: null,
      supplier: null,
    };
  }

  if (!supplierId) {
    if (allowExternalSupplier) {
      if (supplierPrice === undefined || supplierPrice === null || supplierPrice === "") {
        return { error: "Supplier price is required" };
      }

      const externalPrice = Number(supplierPrice);
      if (Number.isNaN(externalPrice) || externalPrice < 0) {
        return { error: "Supplier price cannot be negative" };
      }

      return { error: null, supplier: null };
    }

    return {
      error:
        "Supplier is required for dropshipping product",
    };
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      supplierId
    )
  ) {
    return {
      error: "Invalid supplier ID",
    };
  }

  const supplier =
    await Supplier.findById(
      supplierId
    );

  if (!supplier) {
    return {
      error: "Supplier not found",
    };
  }

  if (!supplier.isActive) {
    return {
      error: "Supplier is inactive",
    };
  }

  if (
    supplierPrice === undefined ||
    supplierPrice === null ||
    supplierPrice === ""
  ) {
    return {
      error:
        "Supplier price is required",
    };
  }

  const price =
    Number(supplierPrice);

  if (
    Number.isNaN(price) ||
    price < 0
  ) {
    return {
      error:
        "Supplier price cannot be negative",
    };
  }

  return {
    error: null,
    supplier,
  };
};

// =====================================================
// VALIDATE PRODUCT DATA
// =====================================================

const validateProductData = async (
  data,
  options = {}
) => {
  const {
    name,
    description,
    category,
    price,
    salePrice,
    stock,
    isDropshipping,
    supplier,
    supplierPrice
  } = data;

  // NAME
  if (
    !name ||
    !String(name).trim()
  ) {
    return "Product name is required";
  }

  // DESCRIPTION
  if (
    !description ||
    !String(description).trim()
  ) {
    return "Product description is required";
  }

  // CATEGORY
  if (!category) {
    return "Category is required";
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      category
    )
  ) {
    return "Invalid category ID";
  }

  const categoryExists =
    await Category.findById(
      category
    );

  if (!categoryExists) {
    return "Category not found";
  }

  // PRICE
  if (
    price === undefined ||
    price === null ||
    price === ""
  ) {
    return "Price is required";
  }

  const productPrice =
    Number(price);

  if (
    Number.isNaN(productPrice) ||
    productPrice < 0
  ) {
    return "Price cannot be negative";
  }

  // SALE PRICE
  if (
    salePrice !== undefined &&
    salePrice !== null &&
    salePrice !== ""
  ) {
    const sale =
      Number(salePrice);

    if (
      Number.isNaN(sale) ||
      sale < 0
    ) {
      return "Sale price cannot be negative";
    }

    if (
      sale > productPrice
    ) {
      return "Sale price cannot be greater than price";
    }
  }

  // STOCK
  if (
    stock !== undefined &&
    stock !== null &&
    stock !== ""
  ) {
    const stockNumber =
      Number(stock);

    if (
      Number.isNaN(stockNumber) ||
      stockNumber < 0
    ) {
      return "Stock cannot be negative";
    }
  }

  // DROPSHIPPING
  const supplierValidation =
    await validateSupplier(
      supplier,
      isDropshipping,
      supplierPrice
    );

  if (
    supplierValidation.error
  ) {
    return supplierValidation.error;
  }

  return null;
};

// =====================================================
// CREATE SINGLE PRODUCT
// =====================================================

const createProduct = async (
  req,
  res
) => {
  try {
    const data = req.body;

    const validationError =
      await validateProductData(
        data
      );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message:
          validationError,
      });
    }

    const {
      name,
      description,
      brand,
      category,
      price,
      salePrice,
      stock,
      sku,
      image,
      images,
      isActive,
      featured,
      newArrival,
      bestSeller,
      isDropshipping,
      supplier,
      supplierName,
      supplierProductId,
      supplierUrl,
      supplierPrice,
      tags,
    } = data;

    // =================================================
    // SKU
    // =================================================

    let productSku;

    if (sku) {
      productSku =
        String(sku)
          .trim()
          .toUpperCase();

      const existingSku =
        await Product.findOne({
          sku: productSku,
        });

      if (existingSku) {
        return res.status(400).json({
          success: false,
          message:
            "SKU already exists",
        });
      }
    }

    // =================================================
    // SLUG
    // =================================================

    const slug =
      await getUniqueSlug(name);

    // =================================================
    // SUPPLIER
    // =================================================

    let finalSupplier = null;

    if (
      toBoolean(isDropshipping)
    ) {
      finalSupplier =
        supplier;
    }

    // =================================================
    // CREATE PRODUCT
    // =================================================

    const product =
      await Product.create({
        name:
          String(name).trim(),

        slug,

        description:
          String(
            description
          ).trim(),

        brand:
          brand
            ? String(
                brand
              ).trim()
            : "",

        category,

        price:
          Number(price),

        salePrice:
          salePrice !==
            undefined &&
          salePrice !==
            null &&
          salePrice !== ""
            ? Number(
                salePrice
              )
            : null,

        stock:
          stock !== undefined &&
          stock !== null &&
          stock !== ""
            ? Number(stock)
            : 0,

        sku:
          productSku,

        image:
          image || "",

        images:
          Array.isArray(images)
            ? images
            : [],

        isActive:
          isActive !== undefined
            ? toBoolean(
                isActive
              )
            : true,

        featured:
          toBoolean(
            featured
          ),

        newArrival:
          toBoolean(
            newArrival
          ),

        bestSeller:
          toBoolean(
            bestSeller
          ),

        isDropshipping:
          toBoolean(
            isDropshipping
          ),

        supplier:
          finalSupplier,

        supplierName:
          supplierName
            ? String(
                supplierName
              ).trim()
            : "",

        supplierProductId:
          supplierProductId
            ? String(
                supplierProductId
              ).trim()
            : "",

        supplierUrl:
          supplierUrl
            ? String(
                supplierUrl
              ).trim()
            : "",

        supplierPrice:
          toBoolean(
            isDropshipping
          )
            ? Number(
                supplierPrice
              )
            : 0,

        tags:
          Array.isArray(tags)
            ? tags.map(
                (tag) =>
                  String(tag).trim()
              )
            : [],
      });

    // =================================================
    // POPULATE
    // =================================================

    const populatedProduct =
      await Product.findById(
        product._id
      )
        .populate(
          "category",
          "name slug image description"
        );

    // =================================================
    // RESPONSE
    // =================================================

    res.status(201).json({
      success: true,

      message:
        "Product created successfully",

      product:
        populatedProduct,
    });
  } catch (error) {
    console.error(
      "Create Product Error:",
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "SKU or slug already exists",
      });
    }

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create product",
    });
  }
};

// =====================================================
// CREATE MULTIPLE PRODUCTS
// =====================================================

const createMultipleProducts =
  async (req, res) => {
    try {
      const {
        products,
      } = req.body;

      if (
        !Array.isArray(
          products
        ) ||
        products.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Products array is required",
        });
      }

      if (
        products.length > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Maximum 100 products can be added at once",
        });
      }

      const preparedProducts =
        [];

      // =================================================
      // VALIDATE ALL PRODUCTS
      // =================================================

      for (
        let i = 0;
        i < products.length;
        i++
      ) {
        const data =
          products[i];

        const validationError =
          await validateProductData(
            data
          );

        if (validationError) {
          return res.status(400).json({
            success: false,
            message:
              `Product ${i + 1}: ${validationError}`,
          });
        }

        // ===============================================
        // SKU
        // ===============================================

        let productSku;

        if (data.sku) {
          productSku =
            String(
              data.sku
            )
              .trim()
              .toUpperCase();

          const existingSku =
            await Product.findOne({
              sku: productSku,
            });

          if (existingSku) {
            return res.status(400).json({
              success: false,
              message:
                `Product ${i + 1}: SKU already exists`,
            });
          }

          const duplicateSku =
            preparedProducts.some(
              (item) =>
                item.sku ===
                productSku
            );

          if (duplicateSku) {
            return res.status(400).json({
              success: false,
              message:
                `Product ${i + 1}: duplicate SKU in request`,
            });
          }
        }

        // ===============================================
        // SLUG
        // ===============================================

        const slug =
          await getUniqueSlug(
            data.name
          );

        // ===============================================
        // PREPARE
        // ===============================================

        preparedProducts.push({
          name:
            String(
              data.name
            ).trim(),

          slug,

          description:
            String(
              data.description
            ).trim(),

          brand:
            data.brand
              ? String(
                  data.brand
                ).trim()
              : "",

          category:
            data.category,

          price:
            Number(
              data.price
            ),

          salePrice:
            data.salePrice !==
              undefined &&
            data.salePrice !==
              null &&
            data.salePrice !== ""
              ? Number(
                  data.salePrice
                )
              : null,

          stock:
            data.stock !==
              undefined &&
            data.stock !==
              null &&
            data.stock !== ""
              ? Number(
                  data.stock
                )
              : 0,

          sku:
            productSku,

          image:
            data.image || "",

          images:
            Array.isArray(
              data.images
            )
              ? data.images
              : [],

          isActive:
            data.isActive !== undefined
              ? toBoolean(data.isActive)
              : true,

          approvalStatus:
            data.approvalStatus || "approved",

          submittedBy:
            req.user?._id || null,

          featured:
            toBoolean(
              data.featured
            ),

          newArrival:
            toBoolean(
              data.newArrival
            ),

          bestSeller:
            toBoolean(
              data.bestSeller
            ),

          isDropshipping:
            toBoolean(
              data.isDropshipping
            ),

          supplier:
            toBoolean(
              data.isDropshipping
            )
              ? data.supplier || null
              : null,

          supplierName:
            data.supplierName
              ? String(
                  data.supplierName
                ).trim()
              : "",

          supplierProductId:
            data.supplierProductId
              ? String(
                  data.supplierProductId
                ).trim()
              : "",

          supplierUrl:
            data.supplierUrl
              ? String(
                  data.supplierUrl
                ).trim()
              : "",

          supplierPrice:
            toBoolean(
              data.isDropshipping
            )
              ? Number(
                  data.supplierPrice || 0
                )
              : 0,

          tags:
            Array.isArray(
              data.tags
            )
              ? data.tags.map(
                  (tag) =>
                    String(
                      tag
                    ).trim()
                ).filter(Boolean)
              : [],
        });
      }

      // =================================================
      // INSERT
      // =================================================

      const createdProducts =
        await Product.insertMany(
          preparedProducts,
          {
            ordered: true,
          }
        );

      // =================================================
      // POPULATE
      // =================================================

      const productIds =
        createdProducts.map(
          (product) =>
            product._id
        );

      const populatedProducts =
        await Product.find({
          _id: {
            $in: productIds,
          },
        })
          .populate(
            "category",
            "name slug image"
          );

      res.status(201).json({
        success: true,

        message:
          `${createdProducts.length} products created successfully`,

        count:
          createdProducts.length,

        products:
          populatedProducts,
      });
    } catch (error) {
      console.error(
        "Create Multiple Products Error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Duplicate SKU or slug found",
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to create multiple products",
      });
    }
  };

// =====================================================
// USER PRODUCT SUBMISSION
// =====================================================

const submitProduct = async (req, res) => {
  try {
    const filePath = req.file?.path;
    const uploadedImage = req.file
      ? typeof filePath === "string" && filePath.startsWith("http")
        ? filePath
        : `https://${req.get("host")}/uploads/products/${req.file.filename}`
      : "";

    const bodyImage =
      typeof req.body?.image === "string"
        ? req.body.image
        : req.body?.image?.url ||
          req.body?.image?.secure_url ||
          req.body?.image?.path ||
          "";

    const data = {
      ...(req.body || {}),
      image: uploadedImage || bodyImage,
    };

    if (!data.image) {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }

    const validationError = await validateProductData({
      ...data,
      isDropshipping: data.isDropshipping,
      supplier: data.supplier,
      supplierPrice: data.supplierPrice,
    }, { allowExternalSupplier: true });

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const product = await Product.create({
      name: String(data.name).trim(),
      slug: await getUniqueSlug(data.name),
      description: String(data.description).trim(),
      brand: data.brand ? String(data.brand).trim() : "",
      category: data.category,
      price: Number(data.price),
      salePrice: data.salePrice !== undefined && data.salePrice !== null && data.salePrice !== "" ? Number(data.salePrice) : null,
      stock: data.stock !== undefined && data.stock !== null && data.stock !== "" ? Number(data.stock) : 0,
      image: data.image || "",
      images: Array.isArray(data.images) ? data.images : [],
      isActive: false,
      approvalStatus: "pending",
      submittedBy: req.user._id,
      isDropshipping: toBoolean(data.isDropshipping),
      supplier: toBoolean(data.isDropshipping) ? data.supplier || null : null,
      supplierName: data.supplierName ? String(data.supplierName).trim() : "",
      supplierProductId: data.supplierProductId ? String(data.supplierProductId).trim() : "",
      supplierUrl: data.supplierUrl ? String(data.supplierUrl).trim() : "",
      supplierPrice: toBoolean(data.isDropshipping) ? Number(data.supplierPrice || 0) : 0,
      tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    });

    return res.status(201).json({
      success: true,
      message: "Product submitted for admin approval",
      product,
    });
  } catch (error) {
    console.error("SUBMIT PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit product",
    });
  }
};

const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ submittedBy: req.user._id })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("GET MY PRODUCTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load your products" });
  }
};

const approveProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const rejected = req.body.approvalStatus === "rejected";
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: rejected ? "rejected" : "approved", isActive: !rejected },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Product ${product.approvalStatus}`,
      product,
    });
  } catch (error) {
    console.error("APPROVE PRODUCT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update approval" });
  }
};

// =====================================================
// GET ALL PRODUCTS
// =====================================================

const getAllProducts =
  async (req, res) => {
    try {
      const {
        search = "",
        category,
        supplier,
        dropshipping,
        featured,
        newArrival,
        bestSeller,
        active,
        minPrice,
        maxPrice,
        page = 1,
        limit = 20,
        sort = "latest",
      } = req.query;

      const pageNumber =
        Math.max(
          Number(page) || 1,
          1
        );

      const limitNumber =
        Math.min(
          Math.max(
            Number(limit) || 20,
            1
          ),
          100
        );

      const skip =
        (pageNumber - 1) *
        limitNumber;

      const filter = {};
      let storePriceOverrides = new Map();

      const storeSubdomain = String(
        req.get("x-store-subdomain") || req.query.store || ""
      ).trim().toLowerCase();

      if (storeSubdomain) {
        const store = await Store.findOne({
          subdomain: storeSubdomain,
          isActive: true,
        }).select("_id");

        if (!store) {
          return res.status(200).json({
            success: true,
            count: 0,
            total: 0,
            page: pageNumber,
            pages: 0,
            products: [],
          });
        }

        const selections = await StoreProduct.find({
          store: store._id,
          isActive: true,
        }).select("product sellingPrice");

        storePriceOverrides = new Map(
          selections.map((selection) => [
            String(selection.product),
            selection.sellingPrice,
          ])
        );

        filter._id = {
          $in: selections.map((selection) => selection.product),
        };
      }

      if (req.query.includePending !== "true") {
        filter.isActive = true;
        filter.$and = [
          {
            $or: [
              { approvalStatus: "approved" },
              { approvalStatus: { $exists: false } },
            ],
          },
        ];
      }

      // =================================================
      // SEARCH
      // =================================================

      if (
        search &&
        search.trim()
      ) {
        filter.$or = [
          {
            name: {
              $regex:
                search.trim(),
              $options: "i",
            },
          },
          {
            brand: {
              $regex:
                search.trim(),
              $options: "i",
            },
          },
          {
            sku: {
              $regex:
                search.trim(),
              $options: "i",
            },
          },
          {
            tags: {
              $regex:
                search.trim(),
              $options: "i",
            },
          },
        ];
      }

      // =================================================
      // CATEGORY
      // =================================================

      if (category) {
        if (
          mongoose.Types.ObjectId.isValid(
            category
          )
        ) {
          filter.category =
            category;
        }
      }

      // =================================================
      // SUPPLIER
      // =================================================

      if (supplier) {
        if (
          mongoose.Types.ObjectId.isValid(
            supplier
          )
        ) {
          filter.supplier =
            supplier;
        }
      }

      // =================================================
      // DROPSHIPPING
      // =================================================

      if (
        dropshipping !==
        undefined
      ) {
        filter.isDropshipping =
          toBoolean(
            dropshipping
          );
      }

      // =================================================
      // FEATURED
      // =================================================

      if (
        featured !==
        undefined
      ) {
        filter.featured =
          toBoolean(
            featured
          );
      }

      // =================================================
      // NEW ARRIVAL
      // =================================================

      if (
        newArrival !==
        undefined
      ) {
        filter.newArrival =
          toBoolean(
            newArrival
          );
      }

      // =================================================
      // BEST SELLER
      // =================================================

      if (
        bestSeller !==
        undefined
      ) {
        filter.bestSeller =
          toBoolean(
            bestSeller
          );
      }

      // =================================================
      // ACTIVE
      // =================================================

      if (
        active !==
        undefined
      ) {
        filter.isActive =
          toBoolean(
            active
          );
      }

      // =================================================
      // PRICE FILTER
      // =================================================

      if (
        minPrice !==
          undefined ||
        maxPrice !==
          undefined
      ) {
        filter.price = {};

        if (
          minPrice !==
          undefined
        ) {
          filter.price.$gte =
            Number(
              minPrice
            );
        }

        if (
          maxPrice !==
          undefined
        ) {
          filter.price.$lte =
            Number(
              maxPrice
            );
        }
      }

      // =================================================
      // SORT
      // =================================================

      let sortOption = {
        createdAt: -1,
      };

      if (
        sort === "oldest"
      ) {
        sortOption = {
          createdAt: 1,
        };
      }

      if (
        sort === "price-low"
      ) {
        sortOption = {
          price: 1,
        };
      }

      if (
        sort === "price-high"
      ) {
        sortOption = {
          price: -1,
        };
      }

      if (
        sort === "name"
      ) {
        sortOption = {
          name: 1,
        };
      }

      // =================================================
      // QUERY
      // =================================================

      const [
        products,
        total,
      ] = await Promise.all([
        Product.find(filter)
          .populate(
            "category",
            "name slug image"
          )
          .sort(sortOption)
          .skip(skip)
          .limit(
            limitNumber
          ),

        Product.countDocuments(
          filter
        ),
      ]);

      res.status(200).json({
        success: true,

        products: products.map((product) => {
          const productData = product.toObject();
          const override = storePriceOverrides.get(String(product._id));
          if (override !== null && override !== undefined) {
            productData.storePrice = override;
            productData.price = override;
          }
          return productData;
        }),

        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages:
            Math.ceil(
              total /
                limitNumber
            ),
        },
      });
    } catch (error) {
      console.error(
        "Get Products Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to get products",
      });
    }
  };

// =====================================================
// GET SINGLE PRODUCT
// =====================================================

const getSingleProduct =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      let query;

      if (
        mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        query = {
          _id: id,
        };
      } else {
        query = {
          slug: id,
        };
      }

      const storeSubdomain = String(
        req.get("x-store-subdomain") || req.query.store || ""
      ).trim().toLowerCase();

      const product =
        await Product.findOne(
          {
            ...query,
            isActive: true,
            $or: [
              { approvalStatus: "approved" },
              { approvalStatus: { $exists: false } },
            ],
          }
        )
          .populate(
            "category",
            "name slug image description"
          );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      const productData = product.toObject();
      if (storeSubdomain) {
        const store = await Store.findOne({ subdomain: storeSubdomain, isActive: true }).select("_id");
        const selection = store ? await StoreProduct.findOne({ store: store._id, product: product._id, isActive: true }).select("sellingPrice") : null;
        if (!selection) {
          return res.status(404).json({ success: false, message: "Product not found in this store" });
        }
        if (selection?.sellingPrice !== null && selection?.sellingPrice !== undefined) {
          productData.storePrice = selection.sellingPrice;
          productData.price = selection.sellingPrice;
        }
      }

      res.status(200).json({
        success: true,
        product: productData,
      });
    } catch (error) {
      console.error(
        "Get Single Product Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to get product",
      });
    }
  };

// =====================================================
// UPDATE PRODUCT
// =====================================================

const updateProduct =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const product =
        await Product.findById(
          id
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      const data =
        req.body;

      // =================================================
      // NAME
      // =================================================

      if (
        data.name !==
        undefined
      ) {
        const name =
          String(
            data.name
          ).trim();

        if (!name) {
          return res.status(400).json({
            success: false,
            message:
              "Product name cannot be empty",
          });
        }

        product.name =
          name;

        product.slug =
          await getUniqueSlug(
            name,
            id
          );
      }

      // =================================================
      // DESCRIPTION
      // =================================================

      if (
        data.description !==
        undefined
      ) {
        const description =
          String(
            data.description
          ).trim();

        if (!description) {
          return res.status(400).json({
            success: false,
            message:
              "Description cannot be empty",
          });
        }

        product.description =
          description;
      }

      // =================================================
      // BRAND
      // =================================================

      if (
        data.brand !==
        undefined
      ) {
        product.brand =
          String(
            data.brand
          ).trim();
      }

      // =================================================
      // CATEGORY
      // =================================================

      if (
        data.category !==
        undefined
      ) {
        if (
          !mongoose.Types.ObjectId.isValid(
            data.category
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid category ID",
          });
        }

        const category =
          await Category.findById(
            data.category
          );

        if (!category) {
          return res.status(404).json({
            success: false,
            message:
              "Category not found",
          });
        }

        product.category =
          data.category;
      }

      // =================================================
      // PRICE
      // =================================================

      if (
        data.price !==
        undefined
      ) {
        const price =
          Number(
            data.price
          );

        if (
          Number.isNaN(price) ||
          price < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid product price",
          });
        }

        product.price =
          price;
      }

      // =================================================
      // SALE PRICE
      // =================================================

      if (
        data.salePrice !==
        undefined
      ) {
        if (
          data.salePrice ===
            null ||
          data.salePrice ===
            ""
        ) {
          product.salePrice =
            null;
        } else {
          const salePrice =
            Number(
              data.salePrice
            );

          if (
            Number.isNaN(
              salePrice
            ) ||
            salePrice < 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid sale price",
            });
          }

          if (
            salePrice >
            product.price
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Sale price cannot be greater than price",
            });
          }

          product.salePrice =
            salePrice;
        }
      }

      // =================================================
      // STOCK
      // =================================================

      if (
        data.stock !==
        undefined
      ) {
        const stock =
          Number(
            data.stock
          );

        if (
          Number.isNaN(
            stock
          ) ||
          stock < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid stock",
          });
        }

        product.stock =
          stock;
      }

      // =================================================
      // SKU
      // =================================================

      if (
        data.sku !==
        undefined
      ) {
        const sku =
          String(
            data.sku
          )
            .trim()
            .toUpperCase();

        if (sku) {
          const existingSku =
            await Product.findOne({
              sku,
              _id: {
                $ne: id,
              },
            });

          if (existingSku) {
            return res.status(400).json({
              success: false,
              message:
                "SKU already exists",
            });
          }

          product.sku =
            sku;
        } else {
          product.sku =
            undefined;
        }
      }

      // =================================================
      // MAIN IMAGE
      // =================================================

      if (
        data.image !==
        undefined
      ) {
        product.image =
          String(
            data.image
          );
      }

      // =================================================
      // MULTIPLE IMAGES
      // =================================================

      if (
        data.images !==
        undefined
      ) {
        if (
          !Array.isArray(
            data.images
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Images must be an array",
          });
        }

        product.images =
          data.images;
      }

      // =================================================
      // ACTIVE
      // =================================================

      if (
        data.isActive !==
        undefined
      ) {
        product.isActive =
          toBoolean(
            data.isActive
          );
      }

      // =================================================
      // FEATURED
      // =================================================

      if (
        data.featured !==
        undefined
      ) {
        product.featured =
          toBoolean(
            data.featured
          );
      }

      // =================================================
      // NEW ARRIVAL
      // =================================================

      if (
        data.newArrival !==
        undefined
      ) {
        product.newArrival =
          toBoolean(
            data.newArrival
          );
      }

      // =================================================
      // BEST SELLER
      // =================================================

      if (
        data.bestSeller !==
        undefined
      ) {
        product.bestSeller =
          toBoolean(
            data.bestSeller
          );
      }

      // =================================================
      // DROPSHIPPING
      // =================================================

      if (
        data.isDropshipping !==
        undefined
      ) {
        product.isDropshipping =
          toBoolean(
            data.isDropshipping
          );
      }

      // =================================================
      // SUPPLIER
      // =================================================

      if (
        data.supplier !==
        undefined
      ) {
        if (
          data.supplier ===
            null ||
          data.supplier ===
            ""
        ) {
          product.supplier =
            null;
        } else {
          if (
            !mongoose.Types.ObjectId.isValid(
              data.supplier
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid supplier ID",
            });
          }

          const supplier =
            await Supplier.findById(
              data.supplier
            );

          if (!supplier) {
            return res.status(404).json({
              success: false,
              message:
                "Supplier not found",
            });
          }

          if (
            !supplier.isActive
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Supplier is inactive",
            });
          }

          product.supplier =
            data.supplier;
        }
      }

      // =================================================
      // SUPPLIER NAME
      // =================================================

      if (
        data.supplierName !==
        undefined
      ) {
        product.supplierName =
          String(
            data.supplierName
          ).trim();
      }

      // =================================================
      // SUPPLIER PRODUCT ID
      // =================================================

      if (
        data.supplierProductId !==
        undefined
      ) {
        product.supplierProductId =
          String(
            data.supplierProductId
          ).trim();
      }

      // =================================================
      // SUPPLIER URL
      // =================================================

      if (
        data.supplierUrl !==
        undefined
      ) {
        product.supplierUrl =
          String(
            data.supplierUrl
          ).trim();
      }

      // =================================================
      // SUPPLIER PRICE
      // =================================================

      if (
        data.supplierPrice !==
        undefined
      ) {
        const supplierPrice =
          Number(
            data.supplierPrice
          );

        if (
          Number.isNaN(
            supplierPrice
          ) ||
          supplierPrice < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid supplier price",
          });
        }

        product.supplierPrice =
          supplierPrice;
      }

      // =================================================
      // TAGS
      // =================================================

      if (
        data.tags !==
        undefined
      ) {
        if (
          !Array.isArray(
            data.tags
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Tags must be an array",
          });
        }

        product.tags =
          data.tags.map(
            (tag) =>
              String(
                tag
              ).trim()
          );
      }

      // =================================================
      // FINAL DROPSHIPPING CHECK
      // =================================================

      if (
        product.isDropshipping
      ) {
        if (
          !product.supplier
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Supplier is required for dropshipping product",
          });
        }

        if (
          product.supplierPrice ===
            undefined ||
          product.supplierPrice ===
            null
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Supplier price is required",
          });
        }
      }

      // =================================================
      // SAVE
      // =================================================

      await product.save();

      // =================================================
      // POPULATE UPDATED PRODUCT
      // =================================================

      const updatedProduct =
        await Product.findById(
          id
        )
          .populate(
            "category",
            "name slug image description"
          );

      res.status(200).json({
        success: true,

        message:
          "Product updated successfully",

        product:
          updatedProduct,
      });
    } catch (error) {
      console.error(
        "Update Product Error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "SKU or slug already exists",
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update product",
      });
    }
  };

// =====================================================
// DELETE PRODUCT
// =====================================================

const deleteProduct =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const product =
        await Product.findById(
          id
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      await Product.findByIdAndDelete(
        id
      );

      res.status(200).json({
        success: true,

        message:
          "Product deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Product Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete product",
      });
    }
  };

// =====================================================
// TOGGLE PRODUCT STATUS
// =====================================================

const toggleProductStatus =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const product =
        await Product.findById(
          id
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      product.isActive =
        !product.isActive;

      await product.save();

      res.status(200).json({
        success: true,

        message:
          product.isActive
            ? "Product activated"
            : "Product deactivated",

        isActive:
          product.isActive,
      });
    } catch (error) {
      console.error(
        "Toggle Product Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to change product status",
      });
    }
  };

// =====================================================
// GET DROPSHIPPING PRODUCTS
// =====================================================

const getDropshippingProducts =
  async (req, res) => {
    try {
      const products =
        await Product.find({
          isDropshipping: true,
          isActive: true,
          $or: [
            { approvalStatus: "approved" },
            { approvalStatus: { $exists: false } },
          ],
        })
          .populate(
            "category",
            "name slug image"
          )
          .populate(
            "supplier",
            "name companyName phone email website isActive"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        success: true,

        count:
          products.length,

        products,
      });
    } catch (error) {
      console.error(
        "Dropshipping Products Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to get dropshipping products",
      });
    }
  };

// =====================================================
// GET PRODUCTS BY SUPPLIER
// =====================================================

const getProductsBySupplier =
  async (req, res) => {
    try {
      const { supplierId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          supplierId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid supplier ID",
        });
      }

      const supplier =
        await Supplier.findById(
          supplierId
        );

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message:
            "Supplier not found",
        });
      }

      const products =
        await Product.find({
          supplier:
            supplierId,
        })
          .populate(
            "category",
            "name slug image"
          )
          .populate(
            "supplier",
            "name companyName phone email website"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        success: true,

        supplier,

        count:
          products.length,

        products,
      });
    } catch (error) {
      console.error(
        "Supplier Products Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to get supplier products",
      });
    }
  };

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  createProduct,
  submitProduct,
  getMyProducts,
  approveProduct,
  createMultipleProducts,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getDropshippingProducts,
  getProductsBySupplier,
};