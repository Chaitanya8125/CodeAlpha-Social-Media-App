import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please log in first." });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "local_demo_secret");
    next();
  } catch {
    return res.status(401).json({ error: "Token is invalid or expired. Please log in again." });
  }
}
