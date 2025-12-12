import { githubGet, githubPut, githubDelete } from "./utils";

export default async function handler(req, res) {
  const { oldPath, newPath } = req.body;

  if (!oldPath || !newPath)
    return res.status(400).json({ error: "oldPath and newPath required" });

  const meta = await githubGet(oldPath);
  const raw = Buffer.from(meta.content, "base64").toString("utf8");

  await githubPut(newPath, raw, `Move to ${newPath}`);
  await githubDelete(oldPath, meta.sha);

  res.status(200).json({ success: true, from: oldPath, to: newPath });
}
