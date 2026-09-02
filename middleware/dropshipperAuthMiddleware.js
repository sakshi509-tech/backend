const jwt = require("jsonwebtoken");

const dropshipperAuthMiddleware = (req, res, next) => {
  try {
    // Get token from headers
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login first.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is for dropshipper
    if (decoded.role !== "dropshipper") {
      return res.status(403).json({
        success: false,
        message: "Only dropshippers can access this resource",
      });
    }

    // Attach dropshipper info to request
    req.dropshipperId = decoded.id;
    req.subdomain = decoded.subdomain;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = dropshipperAuthMiddleware;
