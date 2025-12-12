import crypto from "crypto";
import fetch from "node-fetch";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // -------------------------------------------------------
    // CONFIG
    // -------------------------------------------------------
    const owner = "lirilabs";
    const repo = "drive";
    const targetFolder = "database/encrypted";
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    // AES SECRET
    const AES_KEY = crypto
      .createHash("sha256")
      .update(process.env.ENCRYPT_KEY || "DEFAULT_KEY")
      .digest();
    const AES_IV = crypto.randomBytes(16);

    // -------------------------------------------------------
    // 1. GET RAW USER DATA
    // -------------------------------------------------------
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: "Missing 'data' in body" });
    }

    const stringData = typeof data === "string" ? data : JSON.stringify(data);

    // -------------------------------------------------------
    // 2. ENCRYPT DATA (AES-256-CBC)
    // -------------------------------------------------------
    const cipher = crypto.createCipheriv("aes-256-cbc", AES_KEY, AES_IV);
    let encrypted = cipher.update(stringData, "utf8", "base64");
    encrypted += cipher.final("base64");

    const encryptedPayload = {
      iv: AES_IV.toString("base64"),
      encrypted: encrypted,
      timestamp: Date.now()
    };

    const fileContent = JSON.stringify(encryptedPayload, null, 2);
    const encodedContent = Buffer.from(fileContent).toString("base64");

    // Filename: encrypted_173523523.json
    const fileName = `encrypted_${Date.now()}.json`;
    const filePath = `${targetFolder}/${fileName}`;

    // -------------------------------------------------------
    // 3. SAVE FILE TO GITHUB REPO
    // -------------------------------------------------------
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const commitBody = {
      message: `Encrypted data saved (${fileName})`,
      content: encodedContent
    };

    const uploadRes = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commitBody)
    });

    const uploadJson = await uploadRes.json();

    if (uploadJson.content) {
      return res.status(200).json({
        success: true,
        message: "Encrypted data saved",
        file: filePath,
        commit: uploadJson.commit.sha
      });
    }

    return res.status(500).json({
      error: "GitHub upload failed",
      raw: uploadJson
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
