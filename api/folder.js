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
    // ROOT FOLDER PATH
    // --------------------------------------------------
    const keepFilePath =
      `${baseFolder}/${uid}/root/.keep`;

    const apiUrl =
      `https://api.github.com/repos/${owner}/${repo}/contents/${keepFilePath}`;

    // --------------------------------------------------
    // CREATE ROOT FOLDER (IDEMPOTENT)
    // --------------------------------------------------
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "drive-root-init",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Initialize root folder for ${uid}`,
        content: Buffer.from("root-init").toString("base64")
      })
    });

    const result = await response.json();

    // --------------------------------------------------
    // ALREADY EXISTS = OK
    // --------------------------------------------------
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
      path: `database/users/${uid}/root/`,
      message: "Root folder ready"
    });

  } catch (err) {
    console.error("Root init failed:", err);
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
}
