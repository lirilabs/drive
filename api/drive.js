import fetch from "node-fetch";

let memoryCache = {};       // Safe cache for serverless
let cacheExpiry = {};       // Expiry timestamps

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Only GET allowed" });

  try {
    //----------------------------------------------------------
    // CONFIG
    //----------------------------------------------------------
    const owner = "lirilabs";
    const repo = "drive";
    const folderPath = "database";

    const CACHE_TTL = 1000 * 60 * 3; // Cache 3 min
    const cacheKey = `drive_${folderPath}`;

    //----------------------------------------------------------
    // RETURN CACHE IF VALID
    //----------------------------------------------------------
    if (memoryCache[cacheKey] && Date.now() < cacheExpiry[cacheKey]) {
      return res.status(200).json({
        cached: true,
        folder: folderPath,
        content: memoryCache[cacheKey]
      });
    }

    //----------------------------------------------------------
    // SAFE JSON PARSER
    //----------------------------------------------------------
    function safeJson(text) {
      try { return JSON.parse(text); }
      catch {
        return { invalidJson: true, raw: text };
      }
    }

    //----------------------------------------------------------
    // LOAD JSON FILE
    //----------------------------------------------------------
    async function loadJson(url) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) return { error: true, status: resp.status };

        const text = await resp.text();
        return safeJson(text);

      } catch (err) {
        return { error: true, message: err.message };
      }
    }

    //----------------------------------------------------------
    // READ GITHUB FOLDER (RECURSIVE)
    //----------------------------------------------------------
    async function readFolder(path) {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      let resp;
      try {
        resp = await fetch(apiUrl, {
          headers: {
            "User-Agent": "drive-reader",
            "Accept": "application/vnd.github+json"
          }
        });
      } catch (err) {
        return { error: true, message: "Network error: " + err.message };
      }

      if (!resp.ok) {
        const text = await resp.text();
        return {
          error: true,
          status: resp.status,
          message: text
        };
      }

      let items;
      try {
        items = await resp.json();
      } catch (err) {
        return { error: true, message: "Invalid JSON from GitHub" };
      }

      if (!Array.isArray(items)) {
        return { error: true, raw: items };
      }

      const results = [];
      for (const item of items) {
        if (item.type === "dir") {
          results.push({
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

          results.push(file);
        }
      }

      return results;
    }

    //----------------------------------------------------------
    // EXECUTE READ
    //----------------------------------------------------------
    const output = await readFolder(folderPath);

    // Save cache
    memoryCache[cacheKey] = output;
    cacheExpiry[cacheKey] = Date.now() + CACHE_TTL;

    //----------------------------------------------------------
    // SEND RESPONSE
    //----------------------------------------------------------
    return res.status(200).json({
      cached: false,
      folder: folderPath,
      content: output
    });

  } catch (err) {
    //----------------------------------------------------------
    // GUARANTEED SAFE ERROR RESPONSE (NO CRASH)
    //----------------------------------------------------------
    console.error("Serverless Crash Prevented:", err);

    return res.status(500).json({
      error: true,
      message: "Internal error: " + err.message
    });
  }
}
