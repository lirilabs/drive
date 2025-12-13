import fetch from "node-fetch";

export default async function handler(req, res) {

  // --------------------------------------------------
  // CORS
  // --------------------------------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
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
    // INPUT
    // --------------------------------------------------
    const { uid, itemName, content } = req.body || {};

    if (!uid || !itemName || content === undefined) {
      return res.status(400).json({
        error: "uid, itemName, and content are required"
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
    const fileName = `${safeName}-${date}.json`;

    // 🔴 CHANGED PATH (root instead of items)
    const filePath = `${baseFolder}/${uid}/root/${fileName}`;

    // --------------------------------------------------
    // FILE PAYLOAD
    // --------------------------------------------------
    const fileData = {
      uid,
      name: itemName,
      content,
      createdAt: new Date().toISOString()
    };

    const encodedContent = Buffer
      .from(JSON.stringify(fileData, null, 2))
      .toString("base64");

    // --------------------------------------------------
    // GITHUB CREATE / UPDATE
    // --------------------------------------------------
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "drive-uploader",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add file: ${itemName}`,
        content: encodedContent
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: true,
        github: result
      });
    }

    // --------------------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      uid,
      file: fileName,
      path: filePath,
      url: result.content?.html_url
    });

  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
}
