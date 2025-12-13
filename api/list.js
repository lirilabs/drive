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

    // --------------------------------------------------
    // INPUT
    // --------------------------------------------------
    const { uid } = req.body || {};
    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }

    // --------------------------------------------------
    // TARGET ROOT PATH
    // --------------------------------------------------
    const rootPath = `${basePath}/${uid}/root`;
    const apiUrl =
      `https://api.github.com/repos/${owner}/${repo}/contents/${rootPath}`;

    // --------------------------------------------------
    // FETCH ROOT CONTENTS
    // --------------------------------------------------
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "drive-list-api",
        "Accept": "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: true,
        message: text
      });
    }

    const items = await response.json();

    if (!Array.isArray(items)) {
      return res.status(500).json({
        error: true,
        message: "Invalid GitHub response"
      });
    }

    // --------------------------------------------------
    // CLEAN OUTPUT
    // --------------------------------------------------
    const list = items.map(item => ({
      name: item.name,
      type: item.type === "dir" ? "folder" : "file",
      path: item.path,
      downloadUrl: item.download_url || null
    }));

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      uid,
      count: list.length,
      items: list
    });

  } catch (err) {
    console.error("List error:", err);
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
}
