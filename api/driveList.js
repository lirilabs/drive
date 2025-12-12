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
    const owner = "lirilabs";
    const repo = "drive";
    const rootPath = ""; // Read entire repo
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "google-drive-mirror",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    // ------------------------------------------------------
    // MIME TYPE HELPER
    // ------------------------------------------------------
    function getMime(filename) {
      if (filename.endsWith(".json")) return "application/json";
      if (filename.endsWith(".txt")) return "text/plain";
      if (filename.endsWith(".js")) return "application/javascript";
      if (filename.endsWith(".md")) return "text/markdown";
      if (filename.endsWith(".png")) return "image/png";
      if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
      if (filename.endsWith(".svg")) return "image/svg+xml";

      return "application/octet-stream"; // default
    }

    // ------------------------------------------------------
    // RECURSIVE DRIVE-LIKE READER
    // ------------------------------------------------------
    async function readTree(path = "") {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      
      const resp = await fetch(url, { headers });
      const data = await resp.json();

      if (!Array.isArray(data)) {
        return { error: true, raw: data };
      }

      const output = [];

      for (const item of data) {

        // FOLDER
        if (item.type === "dir") {
          output.push({
            id: item.sha,
            name: item.name,
            type: "folder",
            path: item.path,
            children: await readTree(item.path)  // recursion
          });

        // FILE
        } else {
          output.push({
            id: item.sha,
            name: item.name,
            type: "file",
            path: item.path,
            size: item.size,
            mime: getMime(item.name),
            download_url: item.download_url,
            html_url: item.html_url
          });
        }
      }

      return output;
    }

    // ------------------------------------------------------
    // RETURN FULL DRIVE TREE
    // ------------------------------------------------------
    const driveTree = await readTree(rootPath);

    return res.status(200).json({
      repo,
      owner,
      tree: driveTree
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
