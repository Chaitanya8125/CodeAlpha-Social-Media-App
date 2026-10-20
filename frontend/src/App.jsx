import React from 'react';
import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";
const savedToken = () => localStorage.getItem("social_token") || "";

export default function App() {
  const [token, setToken] = useState(savedToken());
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("social_user") || "null"); } catch { return null; }
  });
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function refresh() {
    if (!token) return;
    try {
      const [p, u] = await Promise.all([request("/posts"), request("/users")]);
      setPosts(p); setUsers(u);
    } catch (e) { setMessage(e.message); }
  }
  useEffect(() => { refresh(); }, [token]);

  async function submitAuth(e) {
    e.preventDefault(); setMessage("");
    try {
      const data = await request(`/auth/${mode === "register" ? "register" : "login"}`, { method: "POST", body: JSON.stringify(form) });
      if (mode === "register") { setMessage(data.message); setMode("login"); return; }
      localStorage.setItem("social_token", data.token);
      localStorage.setItem("social_user", JSON.stringify(data.user));
      setToken(data.token); setUser(data.user); setMessage(data.message);
    } catch (e) { setMessage(e.message); }
  }

  function logout() {
    localStorage.removeItem("social_token"); localStorage.removeItem("social_user");
    setToken(""); setUser(null); setPosts([]); setUsers([]); setMessage("You have logged out.");
  }

  async function createPost(e) {
    e.preventDefault();
    try { await request("/posts", { method: "POST", body: JSON.stringify({ content }) }); setContent(""); setMessage("Post published!"); await refresh(); }
    catch (e) { setMessage(e.message); }
  }
  async function like(id) {
    try { await request(`/posts/${id}/like`, { method: "POST", body: "{}" }); await refresh(); }
    catch (e) { setMessage(e.message); }
  }
  async function comment(id, value) {
    if (!value.trim()) return;
    try { await request(`/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ content: value }) }); setMessage("Comment added."); await refresh(); }
    catch (e) { setMessage(e.message); }
  }
  async function follow(id) {
    try { const result = await request(`/users/${id}/follow`, { method: "POST", body: "{}" }); setMessage(result.message); await refresh(); }
    catch (e) { setMessage(e.message); }
  }

  if (!token) return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="logo">c<span>•</span></div>
        <h1>Connect</h1><p className="muted">A little place to share your world.</p>
        <div className="switch"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Log in</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button></div>
        <form onSubmit={submitAuth} className="stack">
          {mode === "register" && <label>Your name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}
          <label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
          <label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></label>
          <button className="primary" type="submit">{mode === "register" ? "Create account" : "Log in"}</button>
        </form>
        {message && <p className="notice">{message}</p>}
        <p className="tiny">CodeAlpha Internship · Task 2</p>
      </section>
    </main>
  );

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand">Connect<span>•</span></div><div className="top-user">Hello, {user?.name || "friend"} <button className="quiet" onClick={logout}>Log out</button></div></header>
      <main className="layout">
        <aside className="side-card">
          <div className="avatar">{(user?.name || "U").slice(0,1).toUpperCase()}</div><h2>{user?.name}</h2><p className="muted">{user?.email}</p>
          <p className="bio">Welcome to your community. Share an update and meet other members.</p>
          <div className="stat"><strong>{posts.length}</strong><span>posts in feed</span></div>
        </aside>
        <section className="feed">
          <form className="composer card" onSubmit={createPost}><h2>Share an update</h2><textarea value={content} onChange={e => setContent(e.target.value)} maxLength="1000" placeholder="What would you like to share?" required /><div className="composer-bottom"><span className="muted">{content.length}/1000</span><button className="primary" type="submit">Publish post</button></div></form>
          {message && <p className="notice">{message}</p>}
          <h2 className="section-title">Community feed</h2>
          {posts.length === 0 && <div className="card empty">No posts yet. Be the first to share something!</div>}
          {posts.map(post => <Post key={post.id} post={post} onLike={like} onComment={comment} />)}
        </section>
        <aside className="people card"><h2>People</h2><p className="muted">Find your community</p>
          {users.filter(u => u.id !== user?.id).map(person => <div className="person" key={person.id}><div className="mini-avatar">{person.name.slice(0,1).toUpperCase()}</div><div className="person-info"><strong>{person.name}</strong><small>{person.followers} followers</small></div><button className="follow" onClick={() => follow(person.id)}>Follow</button></div>)}
          {users.filter(u => u.id !== user?.id).length === 0 && <p className="muted small">Create another account to test following.</p>}
        </aside>
      </main>
      <footer>Built for CodeAlpha Full Stack Development Internship · Task 2</footer>
    </div>
  );
}

function Post({ post, onLike, onComment }) {
  const [commentText, setCommentText] = useState("");
  return <article className="card post"><div className="post-head"><div className="mini-avatar">{post.name.slice(0,1).toUpperCase()}</div><div><strong>{post.name}</strong><small>{new Date(post.created_at).toLocaleString()}</small></div></div><p className="post-content">{post.content}</p><div className="post-actions"><button className={Number(post.liked_by_me) ? "liked" : ""} onClick={() => onLike(post.id)}>♥ {post.like_count} {Number(post.liked_by_me) ? "Liked" : "Like"}</button><span>{post.comments.length} comments</span></div>
    <div className="comments">{post.comments.map(c => <p key={c.id}><strong>{c.name}:</strong> {c.content}</p>)}</div>
    <form className="comment-form" onSubmit={e => { e.preventDefault(); onComment(post.id, commentText); setCommentText(""); }}><input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." maxLength="500" /><button type="submit">Comment</button></form>
  </article>;
}
