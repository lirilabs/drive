import crypto from "crypto";

const KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPT_KEY || "DEFAULT_KEY")
  .digest();

export function encryptData(data) {
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

export function decryptData({ iv, encrypted }) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, Buffer.from(iv, "base64"));

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}
