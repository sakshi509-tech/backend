// Subdomain detection middleware
// This middleware detects which dropshipper's subdomain is being accessed
const subdomainMiddleware = (req, res, next) => {
  try {
    // Get hostname
    const hostname = req.get("host");

    // Split hostname to get subdomain
    const parts = hostname.split(".");

    // Check if this is a subdomain (not main domain)
    let subdomain = null;

    if (parts.length > 2) {
      // subdomain.example.com -> subdomain
      subdomain = parts[0];
    } else if (parts.length === 2) {
      // Check if it's not localhost:port
      if (!hostname.includes("localhost") && !hostname.includes("127.0.0.1")) {
        // Could be a subdomain with single-level TLD
        // In production, you might have logic here
      }
    }

    // For localhost testing, support query parameter
    if (!subdomain && req.query.subdomain) {
      subdomain = req.query.subdomain;
    }

    // Attach subdomain to request for downstream use
    req.currentSubdomain = subdomain;

    next();
  } catch (error) {
    next(); // Continue even if parsing fails
  }
};

module.exports = subdomainMiddleware;
