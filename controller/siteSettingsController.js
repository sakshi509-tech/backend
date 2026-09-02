const Setting = require("../models/SiteSettings");
const Footer = require("../models/Footer");
const { normalizeUrlLikeName } = require("../utils/urlFormat");
const fs = require("fs");
const path = require("path");

// =====================================================
// GET SETTINGS
// =====================================================

const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();

    // Agar settings nahi hai to create karo
    if (!settings) {
      settings = await Setting.create({
        logo: "",
        siteName: "MyStore",
      });
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get settings",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE SITE NAME
// =====================================================

const updateSiteName = async (req, res) => {
  try {
    const { siteName } = req.body;
    const normalizedName = normalizeUrlLikeName(siteName);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Website name must be a valid URL-like name",
      });
    }

    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting();
    }

    settings.siteName = normalizedName;

    await settings.save();

    const footer = await Footer.findOne();
    if (footer) {
      footer.companyName = settings.siteName;
      await footer.save();
    }

    res.status(200).json({
      success: true,
      message: "Site name updated successfully",
      settings,
    });
  } catch (error) {
    console.error("UPDATE SITE NAME ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update site name",
      error: error.message,
    });
  }
};

const updateAppearance = async (req, res) => {
  try {
    const { themeMode, primaryColor } = req.body;
    let settings = await Setting.findOne();

    if (!settings) settings = new Setting();

    if (themeMode !== undefined) {
      if (!["light", "dark"].includes(themeMode)) {
        return res.status(400).json({ success: false, message: "Invalid theme mode" });
      }
      settings.themeMode = themeMode;
    }

    if (primaryColor !== undefined) {
      if (!/^#[0-9a-fA-F]{6}$/.test(String(primaryColor))) {
        return res.status(400).json({ success: false, message: "Invalid primary color" });
      }
      settings.primaryColor = String(primaryColor).toLowerCase();
    }

    await settings.save();
    return res.status(200).json({ success: true, message: "Appearance updated successfully", settings });
  } catch (error) {
    console.error("UPDATE APPEARANCE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update appearance" });
  }
};

// =====================================================
// UPLOAD LOGO
// =====================================================

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a logo",
      });
    }

    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting();
    }

    // =================================================
    // DELETE OLD LOGO
    // =================================================

    if (settings.logo) {
      try {
        const oldLogoPath = path.join(
          __dirname,
          "..",
          settings.logo.replace(/^\/+/, "")
        );

        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      } catch (error) {
        console.log("OLD LOGO DELETE ERROR:", error.message);
      }
    }

    // =================================================
    // SAVE NEW LOGO URL
    // =================================================

    let logoUrl = req.file.path?.startsWith("http")
      ? req.file.path
      : `/uploads/logo/${req.file.filename}`;

    if (!req.file.path?.startsWith("http")) {
      const fileContents = fs.readFileSync(req.file.path);
      logoUrl = `data:${req.file.mimetype};base64,${fileContents.toString("base64")}`;
      fs.unlinkSync(req.file.path);
    }

    settings.logo = logoUrl;

    await settings.save();

    res.status(200).json({
      success: true,
      message: "Logo updated successfully",
      logo: logoUrl,
      settings,
    });
  } catch (error) {
    console.error("UPLOAD LOGO ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload logo",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE LOGO
// =====================================================

const deleteLogo = async (req, res) => {
  try {
    const settings = await Setting.findOne();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    if (settings.logo) {
      try {
        const logoPath = path.join(
          __dirname,
          "..",
          settings.logo.replace(/^\/+/, "")
        );

        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
      } catch (error) {
        console.log("LOGO DELETE ERROR:", error.message);
      }
    }

    settings.logo = "";

    await settings.save();

    res.status(200).json({
      success: true,
      message: "Logo removed successfully",
      settings,
    });
  } catch (error) {
    console.error("DELETE LOGO ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete logo",
      error: error.message,
    });
  }
};

module.exports = {
  getSettings,
  updateSiteName,
  updateAppearance,
  uploadLogo,
  deleteLogo,
};