const mongoose = require("mongoose");

const dropshipperThemeSchema = new mongoose.Schema(
  {
    // Dropshipper Reference
    dropshipper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dropshipper",
      required: true,
    },

    // Primary Color (brand color)
    primaryColor: {
      type: String,
      default: "#007bff",
    },

    // Secondary Color
    secondaryColor: {
      type: String,
      default: "#6c757d",
    },

    // Accent Color
    accentColor: {
      type: String,
      default: "#28a745",
    },

    // Background Color
    backgroundColor: {
      type: String,
      default: "#ffffff",
    },

    // Text Color
    textColor: {
      type: String,
      default: "#333333",
    },

    // Company Name (Header)
    companyName: {
      type: String,
      trim: true,
    },

    // Company Tagline
    tagline: {
      type: String,
      trim: true,
    },

    // Logo URL
    logoUrl: {
      type: String,
    },

    // Favicon URL
    faviconUrl: {
      type: String,
    },

    // Banner Image URL
    bannerImageUrl: {
      type: String,
    },

    // Footer Text
    footerText: {
      type: String,
      trim: true,
    },

    // Footer Links (Social media, etc)
    footerLinks: [
      {
        name: String,
        url: String,
      },
    ],

    // Font Family
    fontFamily: {
      type: String,
      default: "Arial, sans-serif",
    },

    // Font Size (base size in px)
    fontSize: {
      type: Number,
      default: 14,
    },

    // Border Radius
    borderRadius: {
      type: String,
      default: "4px",
    },

    // Custom CSS
    customCSS: {
      type: String,
      default: "",
    },

    // Feature Toggles
    features: {
      showWishlist: {
        type: Boolean,
        default: true,
      },
      showReviews: {
        type: Boolean,
        default: true,
      },
      showChat: {
        type: Boolean,
        default: true,
      },
      allowGuests: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DropshipperTheme", dropshipperThemeSchema);
