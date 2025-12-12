import fetch from "node-fetch";

export default async function handler(req, res) {

  // CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed", cors: "*" });
  }

  try {
    const owner = "lirilabs";
    const repo = "drive";
    const baseFolder = "database";
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const { file } = req.body;

    // LIST FILES
    if (!file) {
      const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${baseFolder}`;

      const resp = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
      });

      const json = await resp.json();

      if (!Array.isArray(json)) {
        return res.status(500).json({
          error: "Unable to list files",
          cors: "*",
          raw: json
        });
      }

      const files = json.filter(x => x.type === "file").map(x => x.name);

      return res.status(200).json({
        success: true,
        cors: "*",
        files
      });
    }

    // READ A FILE
    const filePath = `${baseFolder}/${file}`;
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const resp = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
    });

    const json = await resp.json();

    if (!json.content) {
      return res.status(404).json({
        error: "File not found",
        cors: "*",
        file,
        raw: json
      });
    }

    // Decode file content (base64)
    const raw = Buffer.from(json.content, "base64").toString("utf8");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    return res.status(200).json({
      success: true,
      cors: "*",
      data: parsed
    });

  } catch (err) {
    return res.status(500).json({ error: err.message, cors: "*" });
  }
}
