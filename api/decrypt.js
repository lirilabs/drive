import { githubGet, decryptAES } from "./utils";

export default async function handler(req, res) {
  const { filename } = req.body;

  if (!filename)
    return res.status(400).json({ error: "filename required" });

  const meta = await githubGet(`database/encrypted/${filename}`);

  const json = JSON.parse(Buffer.from(meta.content, "base64").toString("utf8"));
  const decrypted = decryptAES(json);

  res.status(200).json({ decrypted });
}
