import fetch from "node-fetch";

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ------------------------------------------------------
    // CONFIG
    // ------------------------------------------------------
    const owner = "lirilabs";           // CHANGE IF YOUR REPO OWNER IS DIFFERENT
    const repo = "liri-app";            // MUST BE EXACT REPO NAME (no '-' at end)
    const filePath = "drive/api/drive.js";

    const apiHeaders = {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "single-file-reader",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    // ------------------------------------------------------
    // Fetch GitHub file metadata
    // ------------------------------------------------------
    const metaUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const metaResp = await fetch(metaUrl, { headers: apiHeaders });
    const metaData = await metaResp.json();

    if (!metaData.download_url) {
      return res.status(404).json({
        error: "File Not Found",
        path: filePath,
        raw: metaData
      });
    }

    // ------------------------------------------------------
    // Fetch raw JS file content
    // ------------------------------------------------------
    const jsResp = await fetch(metaData.download_url, {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
    });
    const jsText = await jsResp.text();

    return res.status(200).json({
      file: filePath,
      size: metaData.size,
      encoding: metaData.encoding,
      content: jsText
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
