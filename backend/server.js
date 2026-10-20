import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "./db.js";
import { requireAuth } from "./auth.js";

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const secret = () => process.env.JWT_SECRET || "local_demo_secret";

app.get("/api/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", message: "Social Media API and MySQL are connected." });
  } catch (err) {
    res.status(500).json({ error: "API is running, but MySQL connection failed.", detail: err.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !email || password.length < 6)
      return res.status(400).json({ error: "Name, valid email, and password of at least 6 characters are required." });
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ error: "That email is already registered." });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [name, email, hash]);
    res.status(201).json({ message: "Account created. You can now log in.", user: { id: result.insertId, name, email } });
  } catch (err) { res.status(500).json({ error: "Could not register user.", detail: err.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const [rows] = await db.query("SELECT id, name, email, password_hash, bio FROM users WHERE email = ?", [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json({ error: "Incorrect email or password." });
    const user = rows[0];
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, secret(), { expiresIn: "2h" });
    res.json({ message: "Login successful.", token, user: { id: user.id, name: user.name, email: user.email, bio: user.bio } });
  } catch (err) { res.status(500).json({ error: "Could not log in.", detail: err.message }); }
});

app.get("/api/users", requireAuth, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.bio,
       (SELECT COUNT(*) FROM follows f WHERE f.following_id=u.id) AS followers
       FROM users u ORDER BY u.name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Could not load users.", detail: err.message }); }
});

app.put("/api/users/me", requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const bio = String(req.body.bio || "").trim().slice(0, 250);
    if (!name) return res.status(400).json({ error: "Name is required." });
    await db.query("UPDATE users SET name=?, bio=? WHERE id=?", [name, bio, req.user.id]);
    res.json({ message: "Profile updated." });
  } catch (err) { res.status(500).json({ error: "Could not update profile.", detail: err.message }); }
});

app.get("/api/posts", requireAuth, async (req, res) => {
  try {
    const [posts] = await db.query(
      `SELECT p.id, p.content, p.created_at, u.id AS user_id, u.name,
       (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) AS like_count,
       EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=?) AS liked_by_me
       FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC`, [req.user.id]
    );
    for (const post of posts) {
      const [comments] = await db.query(
        `SELECT c.id, c.content, c.created_at, u.name FROM comments c
         JOIN users u ON u.id=c.user_id WHERE c.post_id=? ORDER BY c.created_at ASC`, [post.id]
      );
      post.comments = comments;
    }
    res.json(posts);
  } catch (err) { res.status(500).json({ error: "Could not load posts.", detail: err.message }); }
});

app.post("/api/posts", requireAuth, async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content || content.length > 1000) return res.status(400).json({ error: "Post must contain 1–1000 characters." });
    const [result] = await db.query("INSERT INTO posts (user_id, content) VALUES (?, ?)", [req.user.id, content]);
    res.status(201).json({ message: "Post created.", id: result.insertId });
  } catch (err) { res.status(500).json({ error: "Could not create post.", detail: err.message }); }
});

app.post("/api/posts/:id/comments", requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const content = String(req.body.content || "").trim();
    if (!Number.isInteger(postId) || postId < 1 || !content || content.length > 500)
      return res.status(400).json({ error: "A valid post ID and comment (1–500 characters) are required." });
    const [result] = await db.query("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)", [postId, req.user.id, content]);
    res.status(201).json({ message: "Comment added.", id: result.insertId });
  } catch (err) { res.status(500).json({ error: "Could not add comment. Check that the post exists.", detail: err.message }); }
});

app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const [existing] = await db.query("SELECT user_id FROM likes WHERE user_id=? AND post_id=?", [req.user.id, postId]);
    if (existing.length) {
      await db.query("DELETE FROM likes WHERE user_id=? AND post_id=?", [req.user.id, postId]);
      return res.json({ message: "Like removed.", liked: false });
    }
    await db.query("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", [req.user.id, postId]);
    res.json({ message: "Post liked.", liked: true });
  } catch (err) { res.status(500).json({ error: "Could not like post. Check that the post exists.", detail: err.message }); }
});

app.post("/api/users/:id/follow", requireAuth, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId < 1) return res.status(400).json({ error: "Invalid user ID." });
    if (targetId === req.user.id) return res.status(400).json({ error: "You cannot follow yourself." });
    const [target] = await db.query("SELECT id FROM users WHERE id=?", [targetId]);
    if (!target.length) return res.status(404).json({ error: "User not found." });
    const [existing] = await db.query("SELECT follower_id FROM follows WHERE follower_id=? AND following_id=?", [req.user.id, targetId]);
    if (existing.length) {
      await db.query("DELETE FROM follows WHERE follower_id=? AND following_id=?", [req.user.id, targetId]);
      return res.json({ message: "Unfollowed user.", following: false });
    }
    await db.query("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)", [req.user.id, targetId]);
    res.json({ message: "Now following user.", following: true });
  } catch (err) { res.status(500).json({ error: "Could not follow user.", detail: err.message }); }
});

app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
