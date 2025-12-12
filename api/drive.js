import fetch from "node-fetch";

export default async function handler(req, res) {

  // ------------------------------------------------------
  // CORS
  // ------------------------------------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // ------------------------------------------------------
    // CONFIG
    // ------------------------------------------------------
    const owner = "lirilabs";
    const repo = "liri-app-";

    const apiHeaders = {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "repo-reader-service",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    const noCacheHeaders = {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    // ------------------------------------------------------
    // Utility: fetch JSON safely
    // ------------------------------------------------------
    async function fetchAsJson(downloadUrl) {
      try {
        const res = await fetch(downloadUrl, { method: "GET", headers: noCacheHeaders });
        const txt = await res.text();

        try {
          return JSON.parse(txt);
        } catch {
          return { invalidJson: true, raw: txt };
        }
      } catch (err) {
        return { error: true, message: err.message };
      }
    }

    // ------------------------------------------------------
    // Recursive folder reader
    // ------------------------------------------------------
    async function readDirectory(path = "") {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const res = await fetch(url, { headers: apiHeaders });
      const data = await res.json();

      if (!Array.isArray(data)) {
        return { error: true, raw: data };
      }

      const output = [];

      for (const item of data) {
        if (item.type === "dir") {
          output.push({
            name: item.name,
            path: item.path,
            type: "directory",
            children: await readDirectory(item.path)
          });
        } else {
          const file = {
            name: item.name,
            path: item.path,
            type: "file",
            download_url: item.download_url
          };

          if (item.name.endsWith(".json")) {
            file.jsonContent = await fetchAsJson(item.download_url);
          }

          output.push(file);
        }
      }

      return output;
    }

    // ------------------------------------------------------
    // Read root directory
    // ------------------------------------------------------
    const rootRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents`,
      { headers: apiHeaders }
    );

    const root = await rootRes.json();

    if (!Array.isArray(root)) {
      return res.status(200).json({ message: "Invalid GitHub response", raw: root });
    }

    // ------------------------------------------------------
    // Extract version folders (v1, v2, v10...)
    // ------------------------------------------------------
    const versionFolders = root
      .filter(i => i.type === "dir" && /^v\d+$/i.test(i.name))
      .map(i => ({
        name: i.name,
        path: i.path,
        number: Number(i.name.replace("v", ""))
      }))
      .sort((a, b) => b.number - a.number);

    const content = {};

    for (const v of versionFolders) {
      content[v.name] = await readDirectory(v.path);
    }

    const latest = versionFolders[0] || null;

    if (latest) {
      latest.files = content[latest.name];
    }

    return res.status(200).json({
      totalVersions: versionFolders.length,
      versions: versionFolders,
      latest,
      content
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
