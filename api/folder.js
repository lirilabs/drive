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
    const basePath = "database/users";

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: "GitHub token missing" });
    }

    // --------------------------------------------------
    // INPUT
    // --------------------------------------------------
    const { uid, folderName } = req.body || {};

    if (!uid || !folderName) {
      return res.status(400).json({
        error: "uid and folderName are required"
      });
    }

    // --------------------------------------------------
    // SAFE FOLDER NAME
    // --------------------------------------------------
    const safeFolder = folderName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // --------------------------------------------------
    // PATH (.keep FILE)
    // --------------------------------------------------
    const keepFilePath =
      `${basePath}/${uid}/root/${safeFolder}/.keep`;

    const apiUrl =
      `https://api.github.com/repos/${owner}/${repo}/contents/${keepFilePath}`;

    // --------------------------------------------------
    // CREATE FOLDER
    // --------------------------------------------------
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "drive-folder-api",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Create folder ${safeFolder} for ${uid}`,
        content: Buffer.from("init").toString("base64")
      })
    });

    const result = await response.json();

    // Folder already exists → OK
    if (!response.ok && response.status !== 422) {
      return res.status(response.status).json({
        error: true,
        github: result
      });
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      uid,
      folderName: safeFolder,
      path: `database/users/${uid}/root/${safeFolder}/`
    });

  } catch (err) {
    console.error("Folder creation error:", err);
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
}
