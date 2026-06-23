# The Order — Image Style Guide

How to recreate **any** image in the site's "same artist" oil-painting style,
start to finish, without help. Follow this exactly and every image will match
the rest of the site.

The look we're matching: a dark, warm, old-master oil painting — heavy visible
brushwork (impasto), gold/amber/umber palette, dramatic single-source light
falling into deep shadow (chiaroscuro), full detail, slightly aged varnish.

---

## What you need every time

1. **The image you want repainted** (a photo, or an existing render that looks
   too smooth / wrong colour / too modern).
2. **3 reference images** — ALWAYS the same locked set. These teach the AI the
   "artist's hand." Keep these 3 saved somewhere you can grab them fast:
   - `hero-horseman.jpg`  (the horseman — hero image)
   - `oil-faq.jpg`  (St George and the dragon)
   - `oil-closing.jpg`  (the Creation / closing image)

   > 3 is the sweet spot. Fewer and it drifts; more and it gets confused.
   > These three are saved in the website's image folder, and Nathan can send
   > them to you once so you keep them forever.

You'll use **ChatGPT** (the image generator) for the painting, and **Upscayl**
(free app) to sharpen it for the website.

---

## Step 1 — Generate the painting in ChatGPT

Open ChatGPT. In one message, **attach the source image FIRST, then the 3
reference images**, and paste this prompt exactly:

> The first image is the source. The remaining images are reference paintings —
> they define the house style. Repaint the source so it looks like it was made
> by the same artist who painted the references, as part of the same series.
>
> Match these exactly:
> - **Medium & surface:** a real, hand-painted classical oil on canvas. Heavy
>   impasto — thick, visible palette-knife strokes, flecks and ridges of raised
>   paint, and fine craquelure/canvas grain across the whole surface. It must
>   look like physical paint, NOT a smooth, airbrushed, or digital/AI render.
> - **Palette:** warm, earthy old-master tones — amber, gold, ochre, deep umber
>   and olive, with rich but controlled colour. Keep full colour and a full
>   range of tones; do NOT desaturate into a flat brown-and-black wash.
> - **Light & tone:** Baroque chiaroscuro — a single warm light source, a
>   luminous focal area falling into deep, moody shadow. Shadows are dark but
>   still readable, never crushed to pure black. Overall mood is dark, warm and
>   reverent.
> - **Finish:** the slightly aged look of a centuries-old varnished oil
>   painting — a faint warm glaze over everything, soft edges, no hard digital
>   lines.
> - **Brushwork:** vary the brushstroke direction and scale across the surface —
>   avoid a uniform, repeating, scale-like texture; strokes should look
>   hand-laid, not tiled.
>
> Keep the full detail, depth and form of the source — faces, figures, textures
> and background must stay sharp and richly painted, not blurred or muddied.
> Same composition. Landscape orientation. No text, no watermark, no signature.

If you want a **portrait (tall)** image instead of landscape, change the last
part to say "Portrait orientation."

---

## Step 2 — Check it (the 4 things that matter)

Look at the result. It's good when ALL four are true:

1. **Texture** — you can see thick, visible brushstrokes and flecks of paint.
   It looks painted, not photographic or smooth.
2. **Colour** — rich and warm, full colour. NOT washed-out, NOT just black and
   yellow.
3. **Shadows** — dark and moody but you can still make out detail in them, not
   crushed to solid black.
4. **Detail** — faces, objects and background are still sharp, not blurry.

### If something's off, add ONE line to the prompt and regenerate:

| Problem | Add this line |
|---|---|
| Looks too smooth / too "AI" / like plastic | "More heavy impasto and visible palette-knife texture — it must look like thick real paint." |
| Lost its colour / looks grey or just brown-and-black | "Richer, fuller colour — do not desaturate; keep warm golds and earth tones." |
| Too dark, can't see anything | "Lift the shadows slightly so detail stays readable; dark but not crushed to black." |
| Texture looks like fish-scales / repeating tiles | "Vary the brushstroke direction and size; avoid a uniform, repeating, tiled texture." |
| Lost detail / looks blurry | "Keep all the fine detail of the source sharp and crisp." |

Regenerate until all four boxes are ticked. Don't settle — the whole site only
looks cohesive if every image clears the bar.

---

## Step 3 — Sharpen it with Upscayl

ChatGPT's image is a bit soft and small. Upscayl makes it big and crisp.

1. Download Upscayl (free): **https://upscayl.org** — install it.
2. Save your chosen ChatGPT image to your computer.
3. Open Upscayl:
   - **Select Image** → pick your saved image.
   - **Upscale Type / Model:** choose **Upscayl Standard 4x**.
   - **Scale:** **4x**.
   - **Save format:** PNG.
   - **Output folder:** pick somewhere easy to find.
   - Click **Upscayl** and wait.
4. You'll get a big PNG file with a name ending in
   `_upscayl_4x_upscayl-standard-4x.png`. **That's the final file.**

> Always upscale the version you actually picked — don't upscale several, just
> the keeper.

---

## Step 4 — Put it on the site yourself (the admin panel)

You don't need to send the image to anyone. You upload it straight into the
website.

1. Go to **theorder.global/admin** and log in.
2. Open the **Images** tab.
3. Find the row for the section you want to change — every section is listed
   (Hero, The Truth, Who We Are, The Principles, We're Offering You,
   Testimonials, Who Am I background, Who Am I portrait, Closing, and so on).
4. Click **Replace** on that row, choose your **Upscayl PNG**, and wait for it
   to finish uploading.
5. Click **Save**.
6. Wait about **30 seconds**, then refresh theorder.global — your new image is
   live.

Notes:
- Max file size 8 MB. The site automatically shrinks big photos for you, so
  don't worry about exact dimensions.
- "Pick from library" lets you reuse any image you've already uploaded, instead
  of uploading it again.
- Each section keeps its own automatic brightness setting so everything stays
  consistent. As long as your image follows the style above (same dark, warm
  feel), it will drop in looking right. If something ever looks too bright or
  too dark compared to the rest, tell Nathan — that's a quick one-off fix.

That's it. Generate → check the 4 things → Upscayl 4x → upload in /admin → Save.

---

## Quick reference (the whole thing in 6 lines)

1. ChatGPT: attach **source image + 3 reference paintings**.
2. Paste the **house-style prompt** (Step 1).
3. Check the **4 things**: texture, colour, readable shadows, detail. Fix with a
   one-line add-on if needed; regenerate.
4. Save the keeper. Open **Upscayl** → **Standard 4x** → **PNG**.
5. Go to **theorder.global/admin → Images**, **Replace** the section's image
   with your Upscayl PNG, **Save**.
6. Wait ~30 seconds, refresh the site. Done.
