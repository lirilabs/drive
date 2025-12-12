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
    const folderPath = "database";

    const apiHeaders = {
      "User-Agent": "folder-reader",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    const noCacheHeaders = {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    // ------------------------------------------------------
    // Load JSON file content
    // ------------------------------------------------------
    async function loadJson(downloadUrl) {
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
    // Recursive folder reader
    // ------------------------------------------------------
    async function readFolder(path) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const resp = await fetch(url, { headers: apiHeaders });
      const items = await resp.json();

      if (!Array.isArray(items)) {
        return { error: true, raw: items };
      }

      const output = [];

      for (const item of items) {
        if (item.type === "dir") {
          output.push({
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
            file.jsonContent = await loadJson(item.download_url);
          }

          output.push(file);
        }
      }

      return output;
    }

    // ------------------------------------------------------
    // READ ONLY THE "database" FOLDER
    // ------------------------------------------------------
    const data = await readFolder(folderPath);

    return res.status(200).json({
      folder: folderPath,
      content: data
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
