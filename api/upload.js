import fetch from "node-fetch";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  /* ---------------- CORS ---------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    /* ---------------- CONFIG ---------------- */
    const owner = "lirilabs";
    const repo = "drive";
    const token = process.env.GITHUB_TOKEN;

    if (!token) return res.status(500).json({ error: "GitHub token missing" });

    /* ---------------- PARSE FORM ---------------- */
    const form = formidable();
    const { fields, files } = await new Promise((res, rej) =>
      form.parse(req, (e, f, fl) => (e ? rej(e) : res({ fields: f, files: fl })))
    );

    const uid = fields.uid?.toString();
    const file = files.file;
    if (!uid || !file) {
      return res.status(400).json({ error: "uid & file required" });
    }

    /* ---------------- PATHS ---------------- */
    const ROOT = `database/users/${uid}/root`;
    const ITEMS = `${ROOT}/items`;

    const safeName = file.originalFilename
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-");

    const filePath = `${ITEMS}/${safeName}`;
    const metaPath = `${ROOT}/${safeName}.json`;
    const indexPath = `${ROOT}/index.json`;

    /* ---------------- HELPERS ---------------- */
    const uploadGitHub = async (path, content, msg) => {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      let sha;

      const check = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (check.ok) sha = (await check.json()).sha;

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: msg,
          content,
          ...(sha && { sha }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      return data.content;
    };

    /* ---------------- UPLOAD FILE ---------------- */
    const fileBuffer = fs.readFileSync(file.filepath);
    const uploadedFile = await uploadGitHub(
      filePath,
      fileBuffer.toString("base64"),
      `Upload ${safeName}`
    );

    /* ---------------- METADATA JSON ---------------- */
    const meta = {
      name: safeName,
      type: file.mimetype,
      size: file.size,
      path: filePath,
      url: uploadedFile.download_url,
      createdAt: new Date().toISOString(),
    };

    await uploadGitHub(
      metaPath,
      Buffer.from(JSON.stringify(meta, null, 2)).toString("base64"),
      `Meta for ${safeName}`
    );

    /* ---------------- UPDATE INDEX ---------------- */
    let index = [];
    const indexUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`;

    const indexRes = await fetch(indexUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let indexSha;
    if (indexRes.ok) {
      const data = await indexRes.json();
      indexSha = data.sha;
      index = JSON.parse(Buffer.from(data.content, "base64").toString());
    }

    index.push({
      name: safeName,
      type: "file",
      meta: metaPath,
      createdAt: meta.createdAt,
    });

    await uploadGitHub(
      indexPath,
      Buffer.from(JSON.stringify(index, null, 2)).toString("base64"),
      "Update index"
    );

    /* ---------------- RESPONSE ---------------- */
    res.json({
      success: true,
      file: meta,
      indexCount: index.length,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
