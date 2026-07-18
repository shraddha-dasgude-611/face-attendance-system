const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const DIR = './public/models/';

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function download(filename) {
  return new Promise((resolve, reject) => {
    const dest = path.join(DIR, filename);
    const file = fs.createWriteStream(dest);
    https.get(BASE + filename, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log('✅', filename); resolve(); });
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

(async () => {
  console.log('Downloading face-api.js models...\n');
  for (const f of files) await download(f);
  console.log('\n🎉 All models downloaded! You can now run npm run dev');
})();
