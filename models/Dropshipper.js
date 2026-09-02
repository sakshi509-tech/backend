const mongoose = require("mongoose");

const dropshipperSchema = new mongoose.Schema(
  {
    // Dropshipper Name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Phone Number (Login)
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Email
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    // Password (hashed)
    password: {
      type: String,
      required: true,
    },

    // Subdomain (e.g., "ravindra" -> ravindra.frontend-q.com)
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Account Verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    // OTP for phone verification
    otp: {
      type: String,
      default: null,
    },

    // OTP Expiry
    otpExpiry: {
      type: Date,
      default: null,
    },

    // Company Info
    businessName: {
      type: String,
      trim: true,
    },

    businessDescription: {
      type: String,
      trim: true,
    },

    // Contact Details
    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    zipCode: {
      type: String,
      trim: true,
    },

    // Products added by this dropshipper
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // Theme Settings (Reference)
    theme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DropshipperTheme",
      default: null,
    },

    // Bank Details (optional for payment processing)
    bankAccount: {
      accountHolder: String,
      accountNumber: String,
      ifscCode: String,
    },

    // Logo/Branding
    logo: {
      type: String,
      default: null,
    },

    // Whatsapp Number (for orders/support)
    whatsappNumber: {
      type: String,
      trim: true,
    },

    // Total Orders
    totalOrders: {
      type: Number,
      default: 0,
    },

    // Rating
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Role (dropshipper)
    role: {
      type: String,
      enum: ["dropshipper"],
      default: "dropshipper",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Dropshipper", dropshipperSchema);
