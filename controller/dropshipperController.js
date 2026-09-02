const Dropshipper = require("../models/Dropshipper");
const DropshipperTheme = require("../models/DropshipperTheme");
const Product = require("../models/product");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ====================================
// DROPSHIPPER REGISTRATION
// ====================================
exports.registerDropshipper = async (req, res) => {
  try {
    const { name, phone, subdomain, businessName, businessDescription } = req.body;

    // Validate required fields
    if (!name || !phone || !subdomain) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and subdomain are required",
      });
    }

    // Check if subdomain is already taken
    const existingDropshipper = await Dropshipper.findOne({ subdomain: subdomain.toLowerCase() });
    if (existingDropshipper) {
      return res.status(400).json({
        success: false,
        message: "Subdomain already taken. Please choose another.",
      });
    }

    // Check if phone is already registered
    const phoneExists = await Dropshipper.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    // Create new dropshipper
    const dropshipper = new Dropshipper({
      name,
      phone,
      subdomain: subdomain.toLowerCase(),
      businessName,
      businessDescription,
    });

    // Generate OTP for phone verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    dropshipper.otp = otp;
    dropshipper.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await dropshipper.save();

    res.status(201).json({
      success: true,
      message: "Registration successful. OTP sent to your phone.",
      dropshipperId: dropshipper._id,
      otp, // In production, send via SMS
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// VERIFY OTP & COMPLETE REGISTRATION
// ====================================
exports.verifyOtpAndSetPassword = async (req, res) => {
  try {
    const { dropshipperId, otp, password } = req.body;

    if (!dropshipperId || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: "Dropshipper ID, OTP, and password are required",
      });
    }

    const dropshipper = await Dropshipper.findById(dropshipperId);

    if (!dropshipper) {
      return res.status(404).json({
        success: false,
        message: "Dropshipper not found",
      });
    }

    // Check OTP expiry
    if (new Date() > dropshipper.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please register again.",
      });
    }

    // Verify OTP
    if (dropshipper.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update dropshipper
    dropshipper.password = hashedPassword;
    dropshipper.isVerified = true;
    dropshipper.otp = null;
    dropshipper.otpExpiry = null;
    dropshipper.isActive = true;

    await dropshipper.save();

    // Create default theme
    const defaultTheme = new DropshipperTheme({
      dropshipper: dropshipper._id,
      companyName: dropshipper.businessName || dropshipper.name,
    });
    await defaultTheme.save();

    dropshipper.theme = defaultTheme._id;
    await dropshipper.save();

    res.status(200).json({
      success: true,
      message: "Account verified successfully. You can now login.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// DROPSHIPPER LOGIN
// ====================================
exports.loginDropshipper = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password are required",
      });
    }

    const dropshipper = await Dropshipper.findOne({ phone })
      .populate("theme")
      .select("+password");

    if (!dropshipper) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone or password",
      });
    }

    if (!dropshipper.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your account first",
      });
    }

    if (!dropshipper.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account is disabled",
      });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, dropshipper.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: dropshipper._id, subdomain: dropshipper.subdomain, role: "dropshipper" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      dropshipper: {
        id: dropshipper._id,
        name: dropshipper.name,
        phone: dropshipper.phone,
        subdomain: dropshipper.subdomain,
        businessName: dropshipper.businessName,
        theme: dropshipper.theme,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// GET DROPSHIPPER PROFILE
// ====================================
exports.getDropshipperProfile = async (req, res) => {
  try {
    const dropshipper = await Dropshipper.findById(req.dropshipperId)
      .populate("theme")
      .populate("products");

    if (!dropshipper) {
      return res.status(404).json({
        success: false,
        message: "Dropshipper not found",
      });
    }

    res.status(200).json({
      success: true,
      dropshipper,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// UPDATE DROPSHIPPER PROFILE
// ====================================
exports.updateDropshipperProfile = async (req, res) => {
  try {
    const { name, businessName, businessDescription, address, city, state, zipCode, whatsappNumber } = req.body;

    const dropshipper = await Dropshipper.findByIdAndUpdate(
      req.dropshipperId,
      {
        name,
        businessName,
        businessDescription,
        address,
        city,
        state,
        zipCode,
        whatsappNumber,
      },
      { new: true, runValidators: true }
    ).populate("theme");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      dropshipper,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// UPDATE DROPSHIPPER THEME
// ====================================
exports.updateDropshipperTheme = async (req, res) => {
  try {
    const { primaryColor, secondaryColor, accentColor, companyName, tagline, logoUrl, customCSS, features } =
      req.body;

    const dropshipper = await Dropshipper.findById(req.dropshipperId);

    if (!dropshipper) {
      return res.status(404).json({
        success: false,
        message: "Dropshipper not found",
      });
    }

    let theme = await DropshipperTheme.findOne({ dropshipper: req.dropshipperId });

    if (!theme) {
      theme = new DropshipperTheme({ dropshipper: req.dropshipperId });
    }

    if (primaryColor) theme.primaryColor = primaryColor;
    if (secondaryColor) theme.secondaryColor = secondaryColor;
    if (accentColor) theme.accentColor = accentColor;
    if (companyName) theme.companyName = companyName;
    if (tagline) theme.tagline = tagline;
    if (logoUrl) theme.logoUrl = logoUrl;
    if (customCSS) theme.customCSS = customCSS;
    if (features) theme.features = { ...theme.features, ...features };

    await theme.save();

    res.status(200).json({
      success: true,
      message: "Theme updated successfully",
      theme,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// ADD PRODUCT TO DROPSHIPPER
// ====================================
exports.addProductToDropshipper = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Update product to include dropshipper
    product.dropshipper = req.dropshipperId;
    await product.save();

    // Add product to dropshipper's products list
    const dropshipper = await Dropshipper.findByIdAndUpdate(
      req.dropshipperId,
      {
        $addToSet: { products: productId },
      },
      { new: true }
    ).populate("products");

    res.status(200).json({
      success: true,
      message: "Product added to dropshipper",
      dropshipper,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// GET DROPSHIPPER PRODUCTS
// ====================================
exports.getDropshipperProducts = async (req, res) => {
  try {
    const { dropshipperId } = req.params;

    const products = await Product.find({ dropshipper: dropshipperId })
      .populate("category")
      .populate("supplier");

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// GET DROPSHIPPER BY SUBDOMAIN
// ====================================
exports.getDropshipperBySubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;

    const dropshipper = await Dropshipper.findOne({ subdomain: subdomain.toLowerCase() }).populate("theme");

    if (!dropshipper) {
      return res.status(404).json({
        success: false,
        message: "Dropshipper not found",
      });
    }

    // Get dropshipper's products
    const products = await Product.find({ dropshipper: dropshipper._id })
      .populate("category")
      .populate("supplier");

    res.status(200).json({
      success: true,
      dropshipper,
      products,
      theme: dropshipper.theme,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// REMOVE PRODUCT FROM DROPSHIPPER
// ====================================
exports.removeProductFromDropshipper = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(productId);

    if (!product || product.dropshipper.toString() !== req.dropshipperId.toString()) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission to remove it",
      });
    }

    // Remove dropshipper reference from product
    product.dropshipper = null;
    await product.save();

    // Remove product from dropshipper's products list
    const dropshipper = await Dropshipper.findByIdAndUpdate(
      req.dropshipperId,
      {
        $pull: { products: productId },
      },
      { new: true }
    ).populate("products");

    res.status(200).json({
      success: true,
      message: "Product removed from dropshipper",
      dropshipper,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// GET ALL DROPSHIPPERS (Admin)
// ====================================
exports.getAllDropshippers = async (req, res) => {
  try {
    const dropshippers = await Dropshipper.find()
      .populate("theme")
      .select("-password");

    res.status(200).json({
      success: true,
      count: dropshippers.length,
      dropshippers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
