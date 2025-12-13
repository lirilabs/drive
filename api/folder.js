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
    const { uid } = req.body || {};
    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }

    // --------------------------------------------------
    // AUTO FOLDER NAME (SERVER CONTROLLED)
    // --------------------------------------------------
    const now = new Date();
    const stamp = now.toISOString()
      .replace(/[:.]/g, "")
      .replace("T", "-")
      .slice(0, 15);

    const folderName = `folder-${stamp}`;

    // --------------------------------------------------
    // FINAL PATH (.keep FILE)
    // --------------------------------------------------
    const keepFilePath =
      `${baseFolder}/${uid}/root/${folderName}/.keep`;

    const apiUrl =
      `https://api.github.com/repos/${owner}/${repo}/contents/${keepFilePath}`;

    // --------------------------------------------------
    // CREATE FOLDER
    // --------------------------------------------------
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "drive-auto-folder",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Create folder ${folderName} for ${uid}`,
        content: Buffer.from("init").toString("base64")
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
    // SUCCESS
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      uid,
      folderName,
      path: `database/users/${uid}/root/${folderName}/`
    });

  } catch (err) {
    console.error("Auto folder creation failed:", err);
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
}
