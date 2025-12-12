import fetch from "node-fetch";

export default async function handler(req, res) {

  // Basic CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ------------------------------------------------------
    // CONFIG
    // ------------------------------------------------------
    const owner = "lirilabs";
    const repo = "liri-app-";
    const folderToRead = "database";

    const headers = {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "database-folder-reader",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    const noCacheHeaders = {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    // ------------------------------------------------------
    // Fetch JSON with no-cache
    // ------------------------------------------------------
    async function readJson(downloadUrl) {
      try {
        const resp = await fetch(downloadUrl, { headers: noCacheHeaders });
        const text = await resp.text();
        try {
          return JSON.parse(text);
        } catch {
          return { invalidJson: true, raw: text };
        }
      } catch (err) {
        return { error: true, message: err.message };
      }
    }

    // ------------------------------------------------------
    // Recursive directory reader
    // ------------------------------------------------------
    async function readFolder(path) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const resp = await fetch(url, { headers });
      const data = await resp.json();

      if (!Array.isArray(data)) {
        return { error: true, raw: data };
      }

      const result = [];

      for (const item of data) {
        if (item.type === "dir") {
          result.push({
            name: item.name,
            path: item.path,
            type: "directory",
            children: await readFolder(item.path)
          });
        } else {
          const file = {
            name: item.name,
            path: item.path,
            type: "file",
            download_url: item.download_url
          };

          if (item.name.endsWith(".json")) {
            file.jsonContent = await readJson(item.download_url);
          }

          result.push(file);
        }
      }

      return result;
    }

    // ------------------------------------------------------
    // Read ONLY the "database" folder
    // ------------------------------------------------------
    const databaseContent = await readFolder(folderToRead);

    return res.status(200).json({
      folder: folderToRead,
      content: databaseContent
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
