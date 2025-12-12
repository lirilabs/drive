import fetch from "node-fetch";

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // CONFIG
    const owner = "lirilabs";
    const repo = "drive";
    const filePath = "api/drive.js";

    const apiHeaders = {
      "User-Agent": "single-file-reader",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    // STEP 1: Get file metadata (to retrieve download_url)
    const metaUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const metaResp = await fetch(metaUrl, { headers: apiHeaders });
    const metaJson = await metaResp.json();

    if (!metaJson.download_url) {
      return res.status(404).json({
        error: "File not found on GitHub",
        path: filePath,
        raw: metaJson
      });
    }

    // STEP 2: Download the raw JS file
    const fileResp = await fetch(metaJson.download_url, {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
    });
    const fileText = await fileResp.text();

    // FINAL RESPONSE
    return res.status(200).json({
      file: filePath,
      size: metaJson.size,
      sha: metaJson.sha,
      content: fileText
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
