import fetch from "node-fetch";
import LRU from "lru-cache";

export default async function handler(req, res) {

  // ------------------------------------------------------
  // CORS (Relax or tighten as required)
  // ------------------------------------------------------
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Only GET allowed" });

  try {
    // ------------------------------------------------------
    // CONFIG
    // ------------------------------------------------------
    const owner = "lirilabs";
    const repo = "drive";
    const folderPath = "database";

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

    const githubHeaders = {
      "User-Agent": "drive-api",
      "Accept": "application/vnd.github+json",
      ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {})
    };

    // ------------------------------------------------------
    // GLOBAL LRU CACHE
    // ------------------------------------------------------
    const cache = global.driveCache || new LRU({
      max: 100,
      ttl: 1000 * 60 * 5, // 5 minutes
      allowStale: true
    });
    global.driveCache = cache;

    const cacheKey = `folder:${folderPath}`;

    // ------------------------------------------------------
    // Return from cache if exists
    // ------------------------------------------------------
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        cached: true,
        folder: folderPath,
        content: cached
      });
    }

    // ------------------------------------------------------
    // Utility: Safe JSON parser
    // ------------------------------------------------------
    const safeJson = (text) => {
      try { return JSON.parse(text); }
      catch {
        return { invalidJson: true, raw: text };
      }
    };

    // ------------------------------------------------------
    // Load JSON file
    // ------------------------------------------------------
    async function loadJson(url) {
      try {
        const r = await fetch(url);
        const t = await r.text();
        return safeJson(t);
      } catch (err) {
        return { error: true, message: err.message };
      }
    }

    // ------------------------------------------------------
    // Recursive GitHub folder reader
    // ------------------------------------------------------
    async function readFolder(path) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

      const resp = await fetch(url, { headers: githubHeaders });

      if (!resp.ok) {
        return { error: true, status: resp.status, message: await resp.text() };
      }

      const items = await resp.json();

      if (!Array.isArray(items)) return { error: true, raw: items };

      const tasks = items.map(async (item) => {
        if (item.type === "dir") {
          return {
            name: item.name,
            path: item.path,
            type: "directory",
            children: await readFolder(item.path)
          };
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

          return file;
        }
      });

      return Promise.all(tasks);
    }

    // ------------------------------------------------------
    // Execute folder read
    // ------------------------------------------------------
    const result = await readFolder(folderPath);

    // Cache the result
    cache.set(cacheKey, result);

    return res.status(200).json({
      cached: false,
      folder: folderPath,
      content: result
    });

  } catch (err) {
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
}
