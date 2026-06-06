const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src = path.resolve('frontend/assets/icon.png');
const outDir = path.resolve('icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [48,60,72,76,120,152,180,192,256,512];

(async function() {
  try {
    for (var i = 0; i < sizes.length; i++) {
      var s = sizes[i];
      var out = path.join(outDir, 'icon-' + s + '.png');
      await sharp(src)
        .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(out);
      console.log('wrote', out);
    }
    console.log('done');
  } catch (err) {
    console.error('error', err);
    process.exit(1);
  }
})();
