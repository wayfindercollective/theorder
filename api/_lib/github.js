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

// File names in a repo directory. A missing directory is an empty list, any
// other failure propagates (so a token/permission problem can't read as
// "no pages exist").
export async function readDir(path) {
  const { kit, owner, name, branch } = getCtx()
  try {
    const res = await kit.repos.getContent({ owner, repo: name, path, ref: branch })
    if (!Array.isArray(res.data)) throw new Error(`expected dir, got file: ${path}`)
    return res.data.filter((e) => e.type === 'file').map((e) => e.name)
  } catch (err) {
    if (err?.status === 404) return []
    throw err
  }
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
  let result
  try {
    result = await attempt(sha, live)
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
        result = await attempt(match[1], live)
      } else {
        // A newer commit really exists — re-resolve against it.
        result = await attempt(fresh.sha, JSON.parse(fresh.content))
      }
    } else {
      throw err
    }
  }
  // The commit sha lets the deploy-status poller wait for THIS change's
  // deployment instead of trusting whatever is currently "latest".
  return { ok: true, commitSha: result?.data?.commit?.sha || null }
}

// Create a file that must NOT already exist. A sha-less write to an existing
// file is rejected by the Contents API, which is exactly the atomic
// "must not exist" precondition page creation needs — no read, no retry.
// Callers map the conflict to "that page already exists".
export async function createJsonFile(path, json, message) {
  const { kit, owner, name, branch } = getCtx()
  const content = JSON.stringify(json, null, 2) + '\n'
  const res = await kit.repos.createOrUpdateFileContents({
    owner,
    repo: name,
    path,
    message: message || `cms: create ${path}`,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch,
  })
  return { ok: true, commitSha: res?.data?.commit?.sha || null }
}

// Delete a file with the same stale-SHA handling as writeJsonFile. A true
// read-404 means already gone (success, no commit); any failure of the delete
// call itself propagates — a masked permission error must never read as
// "deleted".
export async function deleteJsonFile(path, message) {
  const { kit, owner, name, branch } = getCtx()

  let sha
  try {
    const existing = await readJsonFile(path)
    sha = existing.sha
  } catch (err) {
    if (err?.status === 404) return { ok: true, existed: false, commitSha: null }
    throw err
  }

  const attempt = (delSha) => kit.repos.deleteFile({
    owner,
    repo: name,
    path,
    message: message || `cms: delete ${path}`,
    sha: delSha,
    branch,
  })

  let result
  try {
    result = await attempt(sha)
  } catch (err) {
    const msg = err?.message || ''
    const status = err?.status
    const match = msg.match(/is at ([0-9a-f]{40})/i)
    if ((status === 409 || status === 422) && match) {
      // Stale SHA (a save just landed). Re-read for the freshest sha; if the
      // re-read 404s the file is already gone.
      try {
        const fresh = await readJsonFile(path)
        result = await attempt(fresh.sha)
      } catch (err2) {
        if (err2?.status === 404) return { ok: true, existed: false, commitSha: null }
        throw err2
      }
    } else {
      throw err
    }
  }
  return { ok: true, existed: true, commitSha: result?.data?.commit?.sha || null }
}
