/**
 * GitHub helpers — read and write content/*.json via the GitHub Contents API.
 *
 * Requires env vars:
 *   GITHUB_TOKEN — Personal Access Token with `repo` scope
 *   GITHUB_REPO  — "owner/repo" e.g. "wayfindercollective/theorder"
 *   GITHUB_BRANCH (optional) — defaults to "main"
 */

import { Octokit } from '@octokit/rest'

function getCtx() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token) throw new Error('GITHUB_TOKEN not set')
  if (!repo) throw new Error('GITHUB_REPO not set')
  const [owner, name] = repo.split('/')
  if (!owner || !name) throw new Error('GITHUB_REPO must be in "owner/repo" form')
  const branch = process.env.GITHUB_BRANCH || 'main'
  return { token, owner, name, branch, kit: new Octokit({ auth: token }) }
}

export async function readJsonFile(path) {
  const { kit, owner, name, branch } = getCtx()
  const res = await kit.repos.getContent({ owner, repo: name, path, ref: branch })
  // res.data may be array (dir) or object (file). We expect a file.
  if (Array.isArray(res.data)) throw new Error(`expected file, got dir: ${path}`)
  const content = Buffer.from(res.data.content, res.data.encoding || 'base64').toString('utf-8')
  return { content, sha: res.data.sha }
}

export async function writeJsonFile(path, jsonObj, message) {
  const { kit, owner, name, branch } = getCtx()

  // Get current SHA for conditional update (avoid clobbering concurrent edits)
  let sha
  try {
    const existing = await readJsonFile(path)
    sha = existing.sha
  } catch (err) {
    // file doesn't exist — sha stays undefined (create)
  }

  const content = JSON.stringify(jsonObj, null, 2) + '\n'
  const encoded = Buffer.from(content, 'utf-8').toString('base64')

  await kit.repos.createOrUpdateFileContents({
    owner,
    repo: name,
    path,
    message: message || `cms: update ${path}`,
    content: encoded,
    branch,
    sha,
  })
  return { ok: true }
}
