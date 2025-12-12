import { encryptAES, githubPut } from "./utils";

export default async function handler(req, res) {
  const { data, filename } = req.body;

  if (!data || !filename)
    return res.status(400).json({ error: "data + filename required" });

  const encrypted = encryptAES(data);
  const content = JSON.stringify(encrypted, null, 2);

  const result = await githubPut(`database/encrypted/${filename}`, content, "Encrypted Save");

  res.status(200).json(result);
}
