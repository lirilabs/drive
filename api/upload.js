import fetch from "node-fetch";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // REQUIRED for file uploads
  },
};

export default async function handler(req, res) {
  /* ---------------- CORS ---------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    /* ---------------- CONFIG ---------------- */
    const owner = "lirilabs";
    const repo = "drive";

    const ITEMS_DIR = "items";
    const ROOT_DIR = "root";

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: "GitHub token missing" });
    }

    /* ---------------- PARSE FORM ---------------- */
    const form = formidable({ multiples: false });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const uid = fields.uid?.toString();
    const itemName = fields.itemName?.toString();
    const file = files.file;

    if (!uid || !itemName || !file) {
      return res.status(400).json({
        error: "uid, itemName and file are required",
      });
    }

    /* ---------------- SAFE FILE NAME ---------------- */
    const safeName = itemName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const ext = file.originalFilename.split(".").pop();
    const finalFileName = `${safeName}.${ext}`;

    const itemPath = `${ITEMS_DIR}/${finalFileName}`;
    const jsonPath = `${ROOT_DIR}/${safeName}.json`;

    /* ---------------- READ FILE ---------------- */
    const fileBuffer = fs.readFileSync(file.filepath);
    const encodedFile = fileBuffer.toString("base64");

    /* ---------------- UPLOAD FILE ---------------- */
    const uploadToGitHub = async (path, content, message) => {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      let sha;
      const check = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (check.ok) {
        const data = await check.json();
        sha = data.sha;
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          content,
          ...(sha ? { sha } : {}),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(result));

      return result.content;
    };

    const uploadedFile = await uploadToGitHub(
      itemPath,
      encodedFile,
      `Upload file: ${finalFileName}`
    );

    /* ---------------- CREATE ROOT JSON ---------------- */
    const metadata = {
      uid,
      name: itemName,
      file: {
        name: finalFileName,
        path: itemPath,
        url: uploadedFile.download_url,
      },
      createdAt: new Date().toISOString(),
    };

    const encodedJSON = Buffer.from(
      JSON.stringify(metadata, null, 2)
    ).toString("base64");

    const uploadedJSON = await uploadToGitHub(
      jsonPath,
      encodedJSON,
      `Create metadata for ${itemName}`
    );

    /* ---------------- RESPONSE ---------------- */
    return res.status(200).json({
      success: true,
      item: uploadedFile,
      metadata: uploadedJSON,
    });

  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({
      error: true,
      message: err.message,
    });
  }
}
