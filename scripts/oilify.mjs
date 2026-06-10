import sharp from 'sharp'

const DL = 'C:/Users/natha/Downloads/'
const OUT = 'public/images/'

// source ChatGPT render -> clean section-matched name
const jobs = [
  ['ChatGPT Image Jun 9, 2026, 04_08_03 PM (1).png', 'oil-whoweare.jpg'],   // council of knights
  ['ChatGPT Image Jun 9, 2026, 04_08_56 PM.png',     'oil-principles.jpg'],  // the accolade
  ['ChatGPT Image Jun 9, 2026, 04_09_05 PM.png',     'oil-testimony.jpg'],   // st george / serpent
  ['ChatGPT Image Jun 9, 2026, 04_08_47 PM.png',     'oil-founder.jpg'],     // man at window
  ['ChatGPT Image Jun 9, 2026, 04_09_24 PM.png',     'oil-offering.jpg'],    // cavalry charge
  ['ChatGPT Image Jun 9, 2026, 04_09_32 PM.png',     'oil-faq.jpg'],         // lone knight before the host
  ['ChatGPT Image Jun 9, 2026, 04_08_30 PM.png',     'oil-operate.jpg'],     // warrior at the training post
  ['ChatGPT Image Jun 9, 2026, 04_09_40 PM.png',     'oil-application.jpg'], // blessing in the cathedral
  ['ChatGPT Image Jun 9, 2026, 04_09_15 PM.png',     'oil-closing.jpg'],     // kneeling in prayer
]

for (const [src, dest] of jobs) {
  const info = await sharp(DL + src)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(OUT + dest)
  console.log(dest.padEnd(22), info.width + 'x' + info.height, Math.round(info.size / 1024) + 'kb')
}
