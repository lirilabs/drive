import crypto from "crypto";

// GitHub Repo Config
export const owner = "lirilabs";
export const repo = "drive";
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  "Content-Type": "application/json",
  "User-Agent": "vercel-drive-serverless",
  "Cache-Control": "no-cache"
};

// --------------------------------------------------
// GitHub API helpers
// --------------------------------------------------
export async function githubGet(path) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers, cache: "no-store" }
  );
  return res.json();
}

export async function githubPut(path, content, message) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64")
      })
    }
  );
  return res.json();
}

export async function githubUpdate(path, content, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message,
        sha,
        content: Buffer.from(content).toString("base64")
      })
    }
  );
  return res.json();
}

export async function githubDelete(path, sha) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        message: `Delete ${path}`,
        sha
      })
    }
  );
  return res.json();
}

// --------------------------------------------------
// AES Encryption/Decryption (Serverless Safe)
// --------------------------------------------------
const KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPT_KEY)
  .digest();

export function encryptAES(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);

  const text = typeof data === "string" ? data : JSON.stringify(data);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return {
    iv: iv.toString("base64"),
    encrypted
  };
}

export function decryptAES({ iv, encrypted }) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    KEY,
    Buffer.from(iv, "base64")
  );

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}
