const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || "");
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseAuthEnabled = Boolean(supabaseUrl && supabaseAnonKey);
const allowSignup = process.env.ALLOW_SIGNUP !== "false";
const accessUser = process.env.ACCESS_USER || "gloria";
const accessPassword = process.env.ACCESS_PASSWORD || "";
const accessUsers = parseAccessUsers();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const publicPaths = new Set(["/auth.html", "/assets/auth.js"]);

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
}

function normalizeSupabaseUrl(value) {
  const rawValue = trimTrailingSlash(value.trim());
  if (!rawValue) return "";
  try {
    const url = new URL(rawValue);
    return url.origin;
  } catch {
    return rawValue;
  }
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseAccessUsers() {
  const rawUsers = process.env.ACCESS_USERS || "";
  if (!rawUsers.trim()) {
    return accessPassword ? [{ user: accessUser, password: accessPassword }] : [];
  }

  try {
    const users = JSON.parse(rawUsers);
    if (Array.isArray(users)) {
      return users
        .filter((item) => item && item.user && item.password)
        .map((item) => ({ user: String(item.user), password: String(item.password) }));
    }
  } catch {
    return rawUsers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separatorIndex = item.indexOf(":");
        if (separatorIndex === -1) return null;
        return {
          user: item.slice(0, separatorIndex),
          password: item.slice(separatorIndex + 1)
        };
      })
      .filter((item) => item && item.user && item.password);
  }

  return [];
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || "";
  header.split(";").forEach((part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) return;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function cookieSecurity(req) {
  const isHttps = req.headers["x-forwarded-proto"] === "https";
  return isHttps ? "; Secure" : "";
}

function sessionCookies(req, session) {
  const secure = cookieSecurity(req);
  const maxAge = Number(session.expires_in || 3600);
  return [
    `kr_access_token=${encodeURIComponent(session.access_token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`,
    `kr_refresh_token=${encodeURIComponent(session.refresh_token || "")}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure}`
  ];
}

function clearSessionCookies(req) {
  const secure = cookieSecurity(req);
  return [
    `kr_access_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    `kr_refresh_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`
  ];
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function redirectToLogin(req, res) {
  const next = encodeURIComponent(req.url || "/");
  res.writeHead(302, { Location: `/auth.html?next=${next}` });
  res.end();
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function callSupabaseAuth(endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}/auth/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error_description || data.msg || data.message || "Supabase auth request failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function signInWithEmail(email, password) {
  return callSupabaseAuth("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

async function signUpWithEmail(email, password) {
  return callSupabaseAuth("signup", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

async function refreshSession(refreshToken) {
  return callSupabaseAuth("token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
}

async function getSupabaseUser(accessToken) {
  return callSupabaseAuth("user", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

async function getAuthenticatedUser(req, res) {
  if (!supabaseAuthEnabled) return null;
  const cookies = parseCookies(req);
  const accessToken = cookies.kr_access_token;
  const refreshToken = cookies.kr_refresh_token;

  if (accessToken) {
    try {
      return await getSupabaseUser(accessToken);
    } catch {
      // Try the refresh token below.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    res.setHeader("Set-Cookie", sessionCookies(req, session));
    return await getSupabaseUser(session.access_token);
  } catch {
    res.setHeader("Set-Cookie", clearSessionCookies(req));
    return null;
  }
}

function isBasicAuthorized(req) {
  if (!accessUsers.length) return true;
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) return false;

  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  return accessUsers.some((account) => safeEqual(user, account.user) && safeEqual(password, account.password));
}

function requestBasicLogin(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Korean Reading Workbench", charset="UTF-8"',
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end("需要输入访问用户名和密码。");
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalizedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.normalize(path.join(rootDir, normalizedPath));
  if (!filePath.startsWith(rootDir)) return null;
  return filePath;
}

function serveFile(req, res) {
  const filePath = resolveRequestPath(req.url || "/");
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable"
    };
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

async function handleAuthApi(req, res, pathname) {
  if (!supabaseAuthEnabled) {
    sendJson(res, 503, { error: "还没有配置 SUPABASE_URL 和 SUPABASE_ANON_KEY。" });
    return;
  }

  if (pathname === "/auth/me" && req.method === "GET") {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
      sendJson(res, 401, { authenticated: false });
      return;
    }
    sendJson(res, 200, { authenticated: true, email: user.email });
    return;
  }

  if (pathname === "/auth/logout" && req.method === "POST") {
    sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookies(req) });
    return;
  }

  if (pathname === "/auth/login" && req.method === "POST") {
    try {
      const body = await getBody(req);
      const session = await signInWithEmail(String(body.email || ""), String(body.password || ""));
      sendJson(res, 200, { ok: true, email: session.user?.email || body.email }, { "Set-Cookie": sessionCookies(req, session) });
    } catch (error) {
      sendJson(res, error.status || 400, { error: error.message || "登录失败，请检查邮箱和密码。" });
    }
    return;
  }

  if (pathname === "/auth/signup" && req.method === "POST") {
    if (!allowSignup) {
      sendJson(res, 403, { error: "当前网站未开放自行注册。" });
      return;
    }
    try {
      const body = await getBody(req);
      const session = await signUpWithEmail(String(body.email || ""), String(body.password || ""));
      if (session.access_token) {
        sendJson(res, 200, { ok: true, email: session.user?.email || body.email }, { "Set-Cookie": sessionCookies(req, session) });
      } else {
        sendJson(res, 200, { ok: true, needsConfirmation: true, message: "注册已提交，请先到邮箱中确认账号。" });
      }
    } catch (error) {
      sendJson(res, error.status || 400, { error: error.message || "注册失败，请检查邮箱和密码。" });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname.startsWith("/auth/")) {
      await handleAuthApi(req, res, pathname);
      return;
    }

    if (publicPaths.has(pathname)) {
      serveFile(req, res);
      return;
    }

    if (supabaseAuthEnabled) {
      const user = await getAuthenticatedUser(req, res);
      if (!user) {
        redirectToLogin(req, res);
        return;
      }
      serveFile(req, res);
      return;
    }

    if (!isBasicAuthorized(req)) {
      requestBasicLogin(res);
      return;
    }

    serveFile(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, () => {
  console.log(`Korean reading workbench is running on port ${port}`);
  if (supabaseAuthEnabled) {
    console.log(`Supabase auth is enabled for ${supabaseUrl}`);
  } else {
    console.log("Supabase auth is not configured; falling back to simple access control.");
  }
});
