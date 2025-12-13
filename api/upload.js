import fetch from "node-fetch";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // REQUIRED for binary
  },
};

export default async function handler(req, res) {

  // --------------------------------------------------
  // CORS (FULL & CORRECT)
  // --------------------------------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // --------------------------------------------------
    // CONFIG
    // --------------------------------------------------
    const owner = "lirilabs";
    const repo = "drive";
    const baseFolder = "database/users";

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: "GitHub token missing" });
    }

    // --------------------------------------------------
    // PARSE MULTIPART FORM
    // --------------------------------------------------
    const form = formidable({ keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parse error:", err);
        return res.status(500).json({ error: "Form parse failed" });
      }

      const uid = fields.uid;
      const itemName = fields.itemName;
      const file = files.file;

      if (!uid || !itemName || !file) {
        return res.status(400).json({
          error: "uid, itemName and file are required",
        });
      }

      // --------------------------------------------------
      // SAFE FILE NAME
      // --------------------------------------------------
      const safeName = itemName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const date = new Date().toISOString().split("T")[0];
      const fileName = `${safeName}-${date}-${file.originalFilename}`;
      const filePath = `${baseFolder}/${uid}/root/${fileName}`;

      // --------------------------------------------------
      // READ BINARY → BASE64 (SERVER SIDE ONLY)
      // --------------------------------------------------
      const buffer = fs.readFileSync(file.filepath);
      const encodedContent = buffer.toString("base64");

      // --------------------------------------------------
      // UPLOAD TO GITHUB
      // --------------------------------------------------
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      const ghResponse = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "drive-uploader",
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Add file: ${fileName}`,
          content: encodedContent,
        }),
      });

      const result = await ghResponse.json();

      if (!ghResponse.ok) {
        return res.status(ghResponse.status).json({
          error: true,
          github: result,
        });
      }

      // --------------------------------------------------
      // SUCCESS
      // --------------------------------------------------
      return res.status(200).json({
        success: true,
        uid,
        file: fileName,
        size: file.size,
        path: filePath,
        url: result.content?.html_url,
      });
    });

  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(500).json({
      error: true,
      message: err.message,
    });
  }
}
