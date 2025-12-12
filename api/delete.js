import { githubGet, githubDelete } from "./utils";

export default async function handler(req, res) {
  const { path } = req.body;

  if (!path) return res.status(400).json({ error: "path required" });

  const meta = await githubGet(path);
  const result = await githubDelete(path, meta.sha);

  res.status(200).json(result);
}
