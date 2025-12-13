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
    // ROOT PATH
    // --------------------------------------------------
    const rootPath = `${basePath}/${uid}/root`;
    const apiUrl =
      `https://api.github.com/repos/${owner}/${repo}/contents/${rootPath}`;

    // --------------------------------------------------
    // FETCH ROOT ITEMS
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
    // HELPERS
    // --------------------------------------------------
    async function readJsonFile(url) {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    }

    // --------------------------------------------------
    // PROCESS ITEMS
    // --------------------------------------------------
    const folders = [];
    const files = [];

    for (const item of items) {
      if (item.type === "dir") {
        folders.push({
          name: item.name,
          path: item.path,
          type: "folder"
        });
      } else {
        let jsonContent = null;

        if (item.name.endsWith(".json") && item.download_url) {
          jsonContent = await readJsonFile(item.download_url);
        }

        files.push({
          name: item.name,
          path: item.path,
          type: "file",
          content: jsonContent
        });
      }
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      uid,
      folders,
      files,
      folderCount: folders.length,
      fileCount: files.length
    });

  } catch (err) {
    console.error("List error:", err);
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
}
