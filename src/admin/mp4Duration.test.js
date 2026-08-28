import assert from 'node:assert/strict'
import test from 'node:test'
import { finalizeRecordedMp4, inspectMp4 } from './mp4Duration.js'

const concat = (...parts) => {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

const u32 = (value) => {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value)
  return bytes
}

const text = (value) => Uint8Array.from([...value].map((char) => char.charCodeAt(0)))
const zeros = (length) => new Uint8Array(length)
const box = (type, ...body) => {
  const payload = concat(...body)
  return concat(u32(payload.length + 8), text(type), payload)
}
const full = (version = 0, flags = 0) => concat(
  Uint8Array.of(version, (flags >> 16) & 0xff, (flags >> 8) & 0xff, flags & 0xff),
)

function fragmentedMp4(seconds = 3) {
  const mvhd = box('mvhd', full(), zeros(8), u32(1000), u32(0))
  const tkhd = box('tkhd', full(), zeros(8), u32(1), zeros(4), u32(0))
  const mdhd = box('mdhd', full(), zeros(8), u32(1000), u32(0))
  const mdia = box('mdia', mdhd)
  const trak = box('trak', tkhd, mdia)
  const trex = box('trex', full(), u32(1), u32(1), u32(1000), u32(0), u32(0))
  const moov = box('moov', mvhd, trak, box('mvex', trex))

  const tfhd = box('tfhd', full(0, 0x000008), u32(1), u32(1000))
  const tfdt = box('tfdt', full(), u32(0))
  const trun = box('trun', full(), u32(seconds))
  const moof = box('moof', box('traf', tfhd, tfdt, trun))

  return concat(box('ftyp', text('isom'), zeros(8)), moov, moof, box('mdat', zeros(16)))
}

test('writes the complete fragment duration into every zero-duration header', async () => {
  const input = fragmentedMp4(3)
  const before = inspectMp4(input.buffer)
  assert.equal(before.fragmented, true)
  assert.equal(before.declaredDuration, 0)
  assert.equal(before.derivedDuration, 3)

  const result = await finalizeRecordedMp4(new Blob([input], { type: 'video/mp4' }), 3)
  const after = inspectMp4(await result.blob.arrayBuffer())

  assert.equal(result.repaired, true)
  assert.equal(result.duration, 3)
  assert.equal(after.declaredDuration, 3)
  assert.equal(after.tracks[0].declaredDuration, 3)
  assert.equal(result.blob.size, input.byteLength)
})

test('rejects an upload whose fragments stop before the source video does', async () => {
  const input = fragmentedMp4(3)
  await assert.rejects(
    finalizeRecordedMp4(new Blob([input], { type: 'video/mp4' }), 10),
    /ended early/,
  )
})
