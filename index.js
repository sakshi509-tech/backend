require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.set("trust proxy", 1);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      || /^(https?:\/\/)[a-z0-9-]+\.localhost(:\d+)?$/.test(origin)
      || /^https:\/\/[a-z0-9-]+\.frontend-q\.com$/.test(origin)
      || origin === "https://frontend-q.com"
      || origin === "https://www.frontend-q.com";
    return callback(isAllowed ? null : new Error("Origin not allowed"), isAllowed);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-store-subdomain"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

const PORT = process.env.PORT || 2000;
const mongoUri = process.env.MONGO_URI;


  //router

  //userRouter
  const userRoute = require("./router/userRoute")
  app.use("/api/user" , userRoute)

  //category
  const CategoryRouter = require("./router/categoryRoute")
  app.use("/api/category" , CategoryRouter)

  //product
    const productRouter = require("./router/productRoute")
  app.use("/api/product" , productRouter)

//wishlist
const wishlistRoute = require("./router/wishlistRouter")
app.use("/api/wishlist" , wishlistRoute)

//cart
const cartRoute = require("./router/cartRoute")
app.use("/api/cart" , cartRoute)


//admin 
const adminRouter = require("./router/adminRoute");
app.use("/api/admin", adminRouter);

//admin deshboard
const admindeshboard = require("./router/admindeshboardRouter")
app.use("/api/admin", admindeshboard);

//image uploader
const uploadRoutes =
  require("./router/uploadRoute");

app.use(
  "/api/upload",
  uploadRoutes
);

app.use((error, req, res, next) => {
  console.error("REQUEST ERROR:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Image upload failed",
  });
});
//navbar 
const navbarRouter = require("./router/navbarRouter")
app.use("/api/navbar" , navbarRouter)

//sitesetting
const siteSettingsRoutes = require("./router/siteSettingsRouter");
app.use("/api/settings", siteSettingsRoutes);

//footer
const footerRoutes = require("./router/footerRoute");
app.use("/api/footer", footerRoutes);

//menu
const menuRoutes = require("./router/menuRoute");
app.use("/api/menu", menuRoutes);

//banner
const bannerRoutes = require("./router/bannerRoute");
app.use("/api/banner", bannerRoutes);

//whatsapp
const whatsappRoutes  = require("./router/whatsappRoute");
app.use("/api/whatsapp",whatsappRoutes);

//address
const addressRoutes = require("./router/addressRoute");
app.use("/api/address",addressRoutes);

const storeRoutes = require("./router/storeRoute");
app.use("/api/store", storeRoutes);

const startServer = async () => {
  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log("Connected to MongoDB");
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("MongoDB connection failed. Check MONGO_URI or start a local MongoDB instance.");
  console.error(error.message);
  process.exitCode = 1;
});


