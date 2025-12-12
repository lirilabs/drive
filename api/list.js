import { githubGet } from "./utils";

async function walk(path = "") {
  const items = await githubGet(path);

  if (!Array.isArray(items)) return [];

  const results = [];

  for (const item of items) {
    if (item.type === "dir") {
      results.push({
        name: item.name,
        type: "folder",
        path: item.path,
        children: await walk(item.path)
      });
    } else {
      results.push({
        name: item.name,
        type: "file",
        path: item.path,
        size: item.size,
        download_url: item.download_url
      });
    }
  }

  return results;
}

export default async function handler(req, res) {
  const tree = await walk("");
  res.status(200).json(tree);
}
