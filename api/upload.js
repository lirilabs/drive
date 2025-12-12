import { githubPut } from "./utils";

export default async function handler(req, res) {
  const { path, content } = req.body;

  if (!path || !content)
    return res.status(400).json({ error: "path and content required" });

  const result = await githubPut(path, content, `Upload ${path}`);
  res.status(200).json(result);
}
