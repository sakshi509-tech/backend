const normalizeUrlLikeName = (value) => {
  if (value === null || value === undefined) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const withoutProtocol = raw.replace(/^https?:\/\//i, "");
  const withoutWww = withoutProtocol.replace(/^www\./i, "");

  let candidate = withoutWww
    .split(/[/?#]/)[0]
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();

  if (!candidate) return "";

  const cleanSegments = candidate
    .split(".")
    .map((segment) => segment.replace(/^-+|-+$/g, ""))
    .filter(Boolean);

  if (!cleanSegments.length) return "";

  const host = cleanSegments.join(".");
  const finalHost = host.includes(".") ? host : `${host}.in`;

  return `https://${finalHost}`;
};

module.exports = {
  normalizeUrlLikeName,
};
