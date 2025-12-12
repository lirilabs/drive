import fetch from "node-fetch";

const owner = "lirilabs";
const repo = "drive";
const token = process.env.GITHUB_TOKEN;

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
};

export async function githubGet(path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const resp = await fetch(url, { headers });
  return resp.json();
}

export async function githubPut(path, content, message) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message: message,
    content: Buffer.from(content).toString("base64")
  };

  return fetch(url, { method: "PUT", headers, body: JSON.stringify(body) }).then(r => r.json());
}

export async function githubUpdate(path, content, sha, message) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message,
    content: Buffer.from(content).toString("base64"),
    sha
  };

  return fetch(url, { method: "PUT", headers, body: JSON.stringify(body) }).then(r => r.json());
}

export async function githubDelete(path, sha) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message: `Delete ${path}`,
    sha
  };

  return fetch(url, { method: "DELETE", headers, body: JSON.stringify(body) }).then(r => r.json());
}
