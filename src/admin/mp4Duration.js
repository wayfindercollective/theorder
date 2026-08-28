/**
 * Finalise MP4s produced by MediaRecorder.
 *
 * Chromium records MP4 as a normal `ftyp`/`moov` init segment followed by
 * `moof` media fragments. The init segment is emitted while the recording is
 * still live, so its movie and track durations are zero. Chromium reconstructs
 * the duration from every fragment during playback; some stricter players use
 * the zero header and stop at the first ~3–4 second fragment instead.
 *
 * The fragment timeline already contains the exact duration. This module reads
 * that timeline, writes it into mvhd/tkhd/mdhd (and mehd when present), and
 * verifies that the recording covers the source clip before it can be uploaded.
 * It changes metadata only — encoded picture and audio bytes are untouched.
 */

const UINT32_MAX = 0xffffffff
const UINT32_SIZE = 0x100000000

function readUint64(view, offset) {
  const value = view.getUint32(offset) * UINT32_SIZE + view.getUint32(offset + 4)
  if (!Number.isSafeInteger(value)) throw new Error('MP4 uses unsupported 64-bit offsets.')
  return value
}

function writeUint64(view, offset, value) {
  const rounded = Math.max(0, Math.round(value))
  if (!Number.isSafeInteger(rounded)) throw new Error('Video duration is too large to store safely.')
  view.setUint32(offset, Math.floor(rounded / UINT32_SIZE))
  view.setUint32(offset + 4, rounded % UINT32_SIZE)
}

function boxType(view, offset) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  )
}

function readBoxes(view, start = 0, end = view.byteLength) {
  const boxes = []
  let cursor = start

  while (cursor + 8 <= end) {
    let size = view.getUint32(cursor)
    const type = boxType(view, cursor + 4)
    let headerSize = 8

    if (size === 1) {
      if (cursor + 16 > end) throw new Error(`Truncated ${type || 'MP4'} box header.`)
      size = readUint64(view, cursor + 8)
      headerSize = 16
    } else if (size === 0) {
      size = end - cursor
    }

    if (size < headerSize || cursor + size > end) {
      throw new Error(`Invalid ${type || 'MP4'} box size.`)
    }

    boxes.push({ type, start: cursor, size, headerSize })
    cursor += size
  }

  return boxes
}

function children(view, box) {
  return readBoxes(view, box.start + box.headerSize, box.start + box.size)
}

function child(view, box, type) {
  return children(view, box).find((candidate) => candidate.type === type)
}

function payload(box) {
  return box.start + box.headerSize
}

function fullBox(view, box) {
  const offset = payload(box)
  return {
    offset,
    version: view.getUint8(offset),
    flags: view.getUint32(offset) & 0xffffff,
  }
}

function mediaHeader(view, box) {
  const { offset, version } = fullBox(view, box)
  const timescaleOffset = offset + (version === 1 ? 20 : 12)
  const durationOffset = offset + (version === 1 ? 24 : 16)
  return {
    durationOffset,
    durationWidth: version === 1 ? 8 : 4,
    timescale: view.getUint32(timescaleOffset),
    durationTicks: version === 1
      ? readUint64(view, durationOffset)
      : view.getUint32(durationOffset),
  }
}

function trackHeader(view, box) {
  const { offset, version } = fullBox(view, box)
  const idOffset = offset + (version === 1 ? 20 : 12)
  const durationOffset = offset + (version === 1 ? 28 : 20)
  return {
    id: view.getUint32(idOffset),
    durationOffset,
    durationWidth: version === 1 ? 8 : 4,
    durationTicks: version === 1
      ? readUint64(view, durationOffset)
      : view.getUint32(durationOffset),
  }
}

function writeDuration(view, offset, width, ticks) {
  const rounded = Math.max(1, Math.round(ticks))
  if (width === 8) {
    writeUint64(view, offset, rounded)
    return
  }
  if (rounded > UINT32_MAX) throw new Error('Video duration exceeds this MP4 header format.')
  view.setUint32(offset, rounded)
}

function trexDefaults(view, mvex) {
  const defaults = new Map()
  if (!mvex) return defaults

  for (const trex of children(view, mvex).filter((box) => box.type === 'trex')) {
    const { offset } = fullBox(view, trex)
    defaults.set(view.getUint32(offset + 4), view.getUint32(offset + 12))
  }
  return defaults
}

function tfhdDetails(view, box) {
  const { offset, flags } = fullBox(view, box)
  const id = view.getUint32(offset + 4)
  let cursor = offset + 8

  if (flags & 0x000001) cursor += 8 // base_data_offset
  if (flags & 0x000002) cursor += 4 // sample_description_index

  let defaultDuration = 0
  if (flags & 0x000008) defaultDuration = view.getUint32(cursor)

  return { id, defaultDuration }
}

function tfdtTime(view, box) {
  const { offset, version } = fullBox(view, box)
  return version === 1 ? readUint64(view, offset + 4) : view.getUint32(offset + 4)
}

function trunDuration(view, box, defaultDuration) {
  const { offset, flags } = fullBox(view, box)
  const sampleCount = view.getUint32(offset + 4)
  let cursor = offset + 8

  if (flags & 0x000001) cursor += 4 // data_offset
  if (flags & 0x000004) cursor += 4 // first_sample_flags

  let ticks = 0
  for (let sample = 0; sample < sampleCount; sample += 1) {
    if (flags & 0x000100) {
      ticks += view.getUint32(cursor)
      cursor += 4
    } else {
      if (!defaultDuration) throw new Error('MP4 fragment has no sample duration.')
      ticks += defaultDuration
    }
    if (flags & 0x000200) cursor += 4 // sample_size
    if (flags & 0x000400) cursor += 4 // sample_flags
    if (flags & 0x000800) cursor += 4 // sample_composition_time_offset
  }

  return ticks
}

function parseMp4(buffer) {
  const view = new DataView(buffer)
  const top = readBoxes(view)
  const moov = top.find((box) => box.type === 'moov')
  if (!moov) throw new Error('MP4 has no movie header.')

  const mvhd = child(view, moov, 'mvhd')
  if (!mvhd) throw new Error('MP4 has no duration header.')
  const movieHeader = mediaHeader(view, mvhd)
  if (!movieHeader.timescale) throw new Error('MP4 has an invalid movie timescale.')

  const tracks = new Map()
  for (const trak of children(view, moov).filter((box) => box.type === 'trak')) {
    const tkhd = child(view, trak, 'tkhd')
    const mdia = child(view, trak, 'mdia')
    const mdhd = mdia && child(view, mdia, 'mdhd')
    if (!tkhd || !mdhd) continue

    const tkhdInfo = trackHeader(view, tkhd)
    const mdhdInfo = mediaHeader(view, mdhd)
    if (!tkhdInfo.id || !mdhdInfo.timescale) continue

    tracks.set(tkhdInfo.id, {
      id: tkhdInfo.id,
      tkhd: tkhdInfo,
      mdhd: mdhdInfo,
      fragmentEndTicks: 0,
    })
  }
  if (!tracks.size) throw new Error('MP4 has no readable audio or video track.')

  const mvex = child(view, moov, 'mvex')
  const defaults = trexDefaults(view, mvex)
  const fragments = top.filter((box) => box.type === 'moof')

  for (const moof of fragments) {
    for (const traf of children(view, moof).filter((box) => box.type === 'traf')) {
      const trafChildren = children(view, traf)
      const tfhd = trafChildren.find((box) => box.type === 'tfhd')
      if (!tfhd) continue

      const details = tfhdDetails(view, tfhd)
      const track = tracks.get(details.id)
      if (!track) continue

      const tfdt = trafChildren.find((box) => box.type === 'tfdt')
      const startTicks = tfdt ? tfdtTime(view, tfdt) : track.fragmentEndTicks
      const defaultDuration = details.defaultDuration || defaults.get(details.id) || 0
      const durationTicks = trafChildren
        .filter((box) => box.type === 'trun')
        .reduce((sum, trun) => sum + trunDuration(view, trun, defaultDuration), 0)

      track.fragmentEndTicks = Math.max(track.fragmentEndTicks, startTicks + durationTicks)
    }
  }

  const derivedDuration = Math.max(
    0,
    ...[...tracks.values()].map((track) => track.fragmentEndTicks / track.mdhd.timescale),
  )
  const declaredDuration = movieHeader.durationTicks / movieHeader.timescale
  const firstMedia = top.find((box) => box.type === 'moof' || box.type === 'mdat')

  return {
    view,
    top,
    moov,
    mvex,
    mvhd,
    movieHeader,
    tracks,
    fragmented: fragments.length > 0,
    derivedDuration,
    declaredDuration,
    moovBeforeMedia: !firstMedia || moov.start < firstMedia.start,
  }
}

/** Read the duration/layout facts used by upload validation and tests. */
export function inspectMp4(buffer) {
  const parsed = parseMp4(buffer)
  return {
    fragmented: parsed.fragmented,
    declaredDuration: parsed.declaredDuration,
    derivedDuration: parsed.derivedDuration,
    moovBeforeMedia: parsed.moovBeforeMedia,
    tracks: [...parsed.tracks.values()].map((track) => ({
      id: track.id,
      declaredDuration: track.mdhd.durationTicks / track.mdhd.timescale,
      derivedDuration: track.fragmentEndTicks / track.mdhd.timescale,
    })),
  }
}

/**
 * Patch a MediaRecorder MP4 and reject truncated/non-streamable output.
 * Returns the original blob when it is already a safe progressive MP4.
 */
export async function finalizeRecordedMp4(blob, expectedDuration) {
  const buffer = await blob.arrayBuffer()
  const parsed = parseMp4(buffer)
  const expected = Number(expectedDuration)
  const measured = parsed.derivedDuration || parsed.declaredDuration

  if (!parsed.moovBeforeMedia) {
    throw new Error('MP4 index is at the end instead of the start.')
  }
  if (!Number.isFinite(measured) || measured <= 0) {
    throw new Error('MP4 has no readable full duration.')
  }

  if (Number.isFinite(expected) && expected > 0) {
    const shortfall = Math.max(0.75, expected * 0.03)
    const overrun = Math.max(2, expected * 0.1)
    if (measured < expected - shortfall) {
      throw new Error(`Compressed video ended early (${measured.toFixed(1)}s of ${expected.toFixed(1)}s).`)
    }
    if (measured > expected + overrun) {
      throw new Error(`Compressed video duration is invalid (${measured.toFixed(1)}s for a ${expected.toFixed(1)}s clip).`)
    }
  }

  let repaired = false
  let movieDuration = parsed.declaredDuration

  if (parsed.fragmented) {
    movieDuration = parsed.derivedDuration
    for (const track of parsed.tracks.values()) {
      const seconds = track.fragmentEndTicks / track.mdhd.timescale
      if (!seconds) throw new Error('MP4 contains an empty media track.')

      writeDuration(
        parsed.view,
        track.mdhd.durationOffset,
        track.mdhd.durationWidth,
        track.fragmentEndTicks,
      )
      writeDuration(
        parsed.view,
        track.tkhd.durationOffset,
        track.tkhd.durationWidth,
        seconds * parsed.movieHeader.timescale,
      )
    }

    writeDuration(
      parsed.view,
      parsed.movieHeader.durationOffset,
      parsed.movieHeader.durationWidth,
      movieDuration * parsed.movieHeader.timescale,
    )

    const mehd = parsed.mvex && child(parsed.view, parsed.mvex, 'mehd')
    if (mehd) {
      const { offset, version } = fullBox(parsed.view, mehd)
      writeDuration(
        parsed.view,
        offset + 4,
        version === 1 ? 8 : 4,
        movieDuration * parsed.movieHeader.timescale,
      )
    }
    repaired = true
  }

  const output = repaired ? new Blob([buffer], { type: 'video/mp4' }) : blob
  const verified = inspectMp4(await output.arrayBuffer())
  if (!Number.isFinite(verified.declaredDuration) || verified.declaredDuration <= 0) {
    throw new Error('MP4 duration could not be finalised.')
  }
  if (Math.abs(verified.declaredDuration - measured) > 0.15) {
    throw new Error('MP4 duration verification failed.')
  }

  return {
    blob: output,
    duration: verified.declaredDuration,
    fragmented: verified.fragmented,
    repaired,
  }
}
