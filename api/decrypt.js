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
    const baseFolder = "database/encrypted";
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    const AES_KEY = crypto
      .createHash("sha256")
      .update(process.env.ENCRYPT_KEY || "DEFAULT_KEY")
      .digest();

    // -------------------------------------------------------
    // POST BODY
    // -------------------------------------------------------
    const { file } = req.body;

    // -------------------------------------------------------
    // CASE 1: NO FILE PROVIDED → RETURN LIST OF FILES
    // -------------------------------------------------------
    if (!file) {
      const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${baseFolder}`;
      
      const listResp = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
      });

      const listJson = await listResp.json();

      if (!Array.isArray(listJson)) {
        return res.status(500).json({ error: "Unable to list files", raw: listJson });
      }

      const filenames = listJson
        .filter(item => item.type === "file")
        .map(item => item.name);

      return res.status(200).json({
        success: true,
        message: "Choose a file to decrypt",
        files: filenames
      });
    }

    // -------------------------------------------------------
    // CASE 2: FILE PROVIDED → DECRYPT IT
    // -------------------------------------------------------
    const filePath = `${baseFolder}/${file}`;

    const metaUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    
    const metaResp = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
    });
    
    const metaJson = await metaResp.json();

    if (!metaJson.content) {
      return res.status(404).json({
        error: "File not found",
        providedFile: file,
        path: filePath
      });
    }

    // Decode base64 file content
    const rawText = Buffer.from(metaJson.content, "base64").toString("utf8");

    const payload = JSON.parse(rawText);

    const iv = Buffer.from(payload.iv, "base64");
    const encryptedText = payload.encrypted;

    // -------------------------------------------------------
    // DECRYPT USING AES-256-CBC
    // -------------------------------------------------------
    const decipher = crypto.createDecipheriv("aes-256-cbc", AES_KEY, iv);

    let decrypted = decipher.update(encryptedText, "base64", "utf8");
    decrypted += decipher.final("utf8");

    let output;
    try {
      output = JSON.parse(decrypted);
    } catch {
      output = decrypted; // raw string
    }

    return res.status(200).json({
      success: true,
      decrypted: output
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
