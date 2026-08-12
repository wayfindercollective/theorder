/**
 * Seed a variant landing page's content file from the live main-site copy.
 *
 *   npm run seed:variant -- physical
 *
 * Writes content/variants/<slug>.json holding exactly the whitelisted text
 * fields (VARIANT_FIELDS), copied verbatim from content/sections.json — so a
 * fresh variant reads identically to the root page until it is rewritten in
 * /admin. Running it again OVERWRITES the file with current main-site copy;
 * it refuses to clobber an existing file unless --force is passed.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RESERVED_VARIANT_SLUGS, isValidVariantSlug, pickVariantFields } from '../src/config/variantFields.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2).filter((a) => a !== '--')
const force = args.includes('--force')
const slug = args.find((a) => !a.startsWith('-'))

if (!slug || !isValidVariantSlug(slug)) {
  console.error(`Usage: npm run seed:variant -- <slug> [--force]\nAny lowercase letters/digits/hyphens slug works. Planned areas: ${RESERVED_VARIANT_SLUGS.join(', ')}`)
  process.exit(1)
}

const target = resolve(root, 'content/variants', `${slug}.json`)
if (existsSync(target) && !force) {
  console.error(`${target} already exists — pass --force to overwrite it with current main-site copy.`)
  process.exit(1)
}

const sections = JSON.parse(readFileSync(resolve(root, 'content/sections.json'), 'utf8'))
mkdirSync(resolve(root, 'content/variants'), { recursive: true })
writeFileSync(target, JSON.stringify(pickVariantFields(sections), null, 2) + '\n')
console.log(`Seeded ${target}`)
