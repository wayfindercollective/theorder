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

// `jsonOrFn` is either the object to write, or a resolver
// `(liveJsonOrNull) => object` called with the live file content from the
// SAME read that supplied the write SHA — so callers can merge against
// exactly the version they're replacing (and re-merge on conflict retry).
// A plain object means "write exactly this" — it is NOT re-based on conflict
// (last-write-wins); pass a resolver if the write must respect newer commits.
export async function writeJsonFile(path, jsonOrFn, message) {
  const { kit, owner, name, branch } = getCtx()

  const resolve = (live) => (typeof jsonOrFn === 'function' ? jsonOrFn(live) : jsonOrFn)

  async function attempt(sha, live) {
    const content = JSON.stringify(resolve(live), null, 2) + '\n'
    const encoded = Buffer.from(content, 'utf-8').toString('base64')
    return kit.repos.createOrUpdateFileContents({
      owner,
      repo: name,
      path,
      message: message || `cms: update ${path}`,
      content: encoded,
      branch,
      sha,
    })
  }

  let sha
  let live = null
  try {
    const existing = await readJsonFile(path)
    sha = existing.sha
    try { live = JSON.parse(existing.content) } catch { /* corrupt file; write fresh */ }
  } catch {
    // file doesn't exist — sha stays undefined (create)
  }

  // Conditional update with retry: GitHub's CDN can return stale SHAs right
  // after a commit, causing 409 "expected SHA X but is at Y". On conflict we
  // re-read (so a genuinely newer commit feeds the resolver) and retry once;
  // if the re-read still serves the stale blob, fall back to the SHA parsed
  // out of the error with the freshest content we have.
  try {
    await attempt(sha, live)
  } catch (err) {
    const msg = err?.message || ''
    const status = err?.status
    // Match "is at <sha>" from the GitHub Contents API conflict message
    const match = msg.match(/is at ([0-9a-f]{40})/i)
    if ((status === 409 || status === 422) && match) {
      // Re-read to find out which case we're in. If the re-read fails, or a
      // genuinely newer commit exists but can't be parsed, give up — writing
      // against the fresh SHA with a stale merge basis could erase that
      // commit's changes. The admin just saves again.
      const fresh = await readJsonFile(path)
      if (fresh.sha === sha) {
        // CDN served us the stale blob again — our read basis IS the latest
        // content; only the SHA was stale. Use the SHA from the error.
        await attempt(match[1], live)
      } else {
        // A newer commit really exists — re-resolve against it.
        await attempt(fresh.sha, JSON.parse(fresh.content))
      }
    } else {
      throw err
    }
  }
  return { ok: true }
}
