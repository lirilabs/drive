import { githubPut } from "./utils";

export default async function handler(req, res) {
  const { folder } = req.body;

  if (!folder) return res.status(400).json({ error: "folder required" });

  const result = await githubPut(
    `${folder}/.gitkeep`,
    "",
    `Create folder ${folder}`
  );

  res.status(200).json(result);
}
