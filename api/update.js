import { githubGet, githubUpdate } from "./utils";

export default async function handler(req, res) {
  const { path, content } = req.body;

  if (!path || !content)
    return res.status(400).json({ error: "path and content required" });

  const meta = await githubGet(path);

  const result = await githubUpdate(path, content, meta.sha, `Update ${path}`);
  res.status(200).json(result);
}
