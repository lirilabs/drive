import fetch from "node-fetch";
import crypto from "crypto";

export default async function handler(req, res) {
  /* ---------------- CORS ---------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { uid, url } = req.query;
    if (!uid || !url) {
      return res.status(400).json({ error: "uid and url required" });
    }

    /* ---------------- CONFIG ---------------- */
    const owner = "lirilabs";
    const repo = "drive";
    const token = process.env.GITHUB_TOKEN;

    const ROOT = `database/users/${uid}/root`;
    const ITEMS = `${ROOT}/items`;

    /* ---------------- FETCH REMOTE FILE ---------------- */
    const remote = await fetch(url);
    if (!remote.ok) {
      return res.status(400).json({ error: "Failed to fetch image URL" });
    }

    const buffer = Buffer.from(await remote.arrayBuffer());
    const contentType = remote.headers.get("content-type") || "image/png";
    const ext = contentType.split("/")[1] || "png";

    /* ---------------- RANDOM NAME ---------------- */
    const id = crypto.randomBytes(6).toString("hex");
    const fileName = `${id}.${ext}`;

    const filePath = `${ITEMS}/${fileName}`;
    const metaPath = `${ROOT}/${id}.json`;
    const indexPath = `${ROOT}/index.json`;

    /* ---------------- GITHUB UPLOAD HELPER ---------------- */
    const upload = async (path, content, message) => {
      const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      let sha;
      const check = await fetch(api, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (check.ok) sha = (await check.json()).sha;

      const res = await fetch(api, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          content,
          ...(sha && { sha }),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
      return json.content;
    };

    /* ---------------- UPLOAD IMAGE ---------------- */
    const uploadedFile = await upload(
      filePath,
      buffer.toString("base64"),
      `Upload from URL: ${fileName}`
    );

    /* ---------------- METADATA ---------------- */
    const meta = {
      id,
      type: "image",
      source: "url",
      originalUrl: url,
      mime: contentType,
      path: filePath,
      url: uploadedFile.download_url,
      createdAt: new Date().toISOString(),
    };

    await upload(
      metaPath,
      Buffer.from(JSON.stringify(meta, null, 2)).toString("base64"),
      `Meta for ${fileName}`
    );

    /* ---------------- UPDATE INDEX ---------------- */
    let index = [];
    let indexSha;

    const indexApi = `https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`;
    const indexRes = await fetch(indexApi, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (indexRes.ok) {
      const d = await indexRes.json();
      indexSha = d.sha;
      index = JSON.parse(Buffer.from(d.content, "base64").toString());
    }

    index.push({
      id,
      type: "image",
      meta: metaPath,
      createdAt: meta.createdAt,
    });

    await upload(
      indexPath,
      Buffer.from(JSON.stringify(index, null, 2)).toString("base64"),
      "Update index"
    );

    /* ---------------- RESPONSE ---------------- */
    res.json({
      success: true,
      file: meta,
      totalItems: index.length,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
