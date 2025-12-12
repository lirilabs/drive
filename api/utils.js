
import fetch from "node-fetch";
import crypto from "crypto";

// GitHub config
export const owner = "lirilabs";
export const repo = "drive";
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  "Content-Type": "application/json",
  "User-Agent": "drive-api-service",
  "Cache-Control": "no-cache"
};

// ---------------------
// GitHub Utils
// ---------------------

export async function githubGet(path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, { headers });
  return res.json();
}

export async function githubPut(path, content, message) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message,
    content: Buffer.from(content).toString("base64")
  };

  return fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  }).then(r => r.json());
}

export async function githubUpdate(path, content, sha, message) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message,
    sha,
    content: Buffer.from(content).toString("base64")
  };

  return fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  }).then(r => r.json());
}

export async function githubDelete(path, sha) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message: `Delete ${path}`,
    sha
  };

  return fetch(url, {
    method: "DELETE",
    headers,
    body: JSON.stringify(body)
  }).then(r => r.json());
}

// ---------------------
// AES Encryption Utils
// ---------------------

const AES_KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPT_KEY || "DEFAULT_KEY")
  .digest();

export function encryptAES(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", AES_KEY, iv);

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
    AES_KEY,
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
