#!/usr/bin/env node
/**
 * Batch renderer: extracts every 3D trait mesh from mfermashup.glb
 * as individual transparent PNGs, structured like OG mfer layers.
 *
 * Usage: node scripts/render-3d-layers.js
 * Requires: playwright (npx playwright install chromium)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/Users/mfergpt/.openclaw/workspace/data/derivative-layers/3d';
const GLB_URL = 'https://sfo3.digitaloceanspaces.com/cybermfers/cybermfers/builders/mfermashup.glb';
const RENDER_SIZE = 1000;

// ---------------------------------------------------------------------------
// Mesh mapping (mirrored from traitMeshMapping.ts)
// ---------------------------------------------------------------------------
const TRAIT_MESH_MAPPING = {
  watch: {
    sub_lantern_green: ['watch_sub_lantern_green', 'watch_sub_strap_white'],
    sub_blue: ['watch_sub_blue', 'watch_sub_strap_white'],
    argo_white: ['watch_argo_white'],
    sub_cola: ['watch_sub_cola_blue_red', 'watch_sub_strap_white'],
    sub_turquoise: ['watch_sub_turquoise', 'watch_sub_strap_white'],
    sub_bat: ['watch_sub_bat_blue_black', 'watch_sub_strap_white'],
    oyster_silver: ['watch_oyster_silver', 'watch_sub_strap_white'],
    oyster_gold: ['watch_oyster_gold', 'watch_sub_strap_gold'],
    argo_black: ['watch_argo_black'],
    sub_black: ['watch_sub_black', 'watch_sub_strap_white'],
    sub_rose: ['watch_sub_rose', 'watch_sub_strap_white'],
    timex: ['watch_timex'],
    sub_red: ['watch_sub_red', 'watch_sub_strap_gray'],
  },
  beard: {
    full: ['beard'],
    flat: ['beard_flat'],
  },
  chain: {
    silver: ['chain_silver'],
    gold: ['chain_gold'],
    onchain: ['chain_onchain'],
  },
  eyes: {
    nerd: ['eyes_normal', 'eyes_glasses', 'eyes_glasses_nerd'],
    purple_shades: ['eyes_normal', 'eyes_glasses', 'eyes_glasses_purple'],
    '3d': ['eyes_normal', 'eyes_glases_3d', 'eyes_glasses_3d_lenses', 'eyes_glases_3d_rim'],
    eye_mask: ['eyes_normal', 'eyes_eye_mask'],
    vr: ['eyes_normal', 'eyes_vr', 'eyes_vr_lense'],
    shades: ['eyes_normal', 'eyes_glasses', 'eyes_glasses_shades'],
    matrix: ['eyes_normal', 'eyes_glasses', 'eyes_glasses_shades_matrix'],
    trippy: ['eyes_normal', 'eyes_glasses', 'eyes_glasses_shades_s34n'],
    regular: ['eyes_normal'],
    metal: ['eyes_metal'],
    mfercoin: ['eyes_mfercoin'],
    red: ['eyes_red'],
    alien: ['eyes_alien'],
    zombie: ['eyes_zombie'],
    eyepatch: ['eyes_normal', 'eyes_eye_patch'],
  },
  hat_over_headphones: {
    cowboy: ['hat_cowboy_hat'],
    top: ['hat_tophat', 'hat_tophat_red'],
    pilot: ['hat_pilot_cap', 'hat_pilot_cap_rims', 'hat_pilot_cap_glasses'],
    hoodie_gray: ['shirt_hoodie_up_dark_gray', 'shirt_hoodie_dark_gray'],
    hoodie_pink: ['shirt_hoodie_up_pink', 'shirt_hoodie_pink'],
    hoodie_red: ['shirt_hoodie_up_red', 'shirt_hoodie_red'],
    hoodie_blue: ['shirt_hoodie_up_blue', 'shirt_hoodie_blue'],
    hoodie_white: ['shirt_hoodie_up_white', 'shirt_hoodie_white'],
    hoodie_green: ['shirt_hoodie_up_green', 'shirt_hoodie_green'],
    larva_mfer: ['larmf-lowpoly', 'larmf-lowpoly_1', 'larmf-lowpoly_2', 'larmf-lowpoly_3', 'larmf-lowpoly_4', 'larmf-lowpoly_5', 'larmf-lowpoly_6'],
  },
  hat_under_headphones: {
    bandana_dark_gray: ['hat_bandana_dark_gray'],
    knit_kc: ['hat_knit_kc'],
    headband_blue_green: ['headband_blue_green'],
    headband_green_white: ['headband_green_white'],
    knit_las_vegas: ['hat_knit_las_vegas'],
    cap_monochrome: ['cap_monochrome'],
    knit_new_york: ['hat_knit_new_york'],
    cap_based_blue: ['cap_based_blue'],
    cap_purple: ['cap_purple'],
    knit_san_fran: ['hat_knit_san_fran'],
    knit_miami: ['hat_knit_miami'],
    knit_chicago: ['hat_knit_chicago'],
    knit_atlanta: ['hat_knit_atlanta'],
    bandana_red: ['hat_bandana_red'],
    knit_cleveland: ['hat_knit_cleveland'],
    headband_blue_red: ['headband_blue_red'],
    knit_dallas: ['hat_knit_dallas'],
    beanie_monochrome: ['hat_beanie_monochrome'],
    headband_pink_white: ['headband_pink_white'],
    beanie: ['hat_beanie'],
    knit_baltimore: ['hat_knit_baltimore'],
    knit_buffalo: ['hat_knit_buffalo'],
    bandana_blue: ['hat_bandana_blue'],
    headband_blue_white: ['headband_blue_white'],
    knit_pittsburgh: ['hat_knit_pittsburgh'],
  },
  headphones: {
    lined: ['headphones_lined'],
    gold: ['headphones_gold'],
    blue: ['headphones_blue'],
    black: ['headphones_black'],
    pink: ['headphones_pink'],
    green: ['headphones_green'],
    white: ['headphones_white'],
    red: ['headphones_red'],
    black_square: ['headphones_square_black'],
    blue_square: ['headphones_square_blue'],
    gold_square: ['headphones_square_gold'],
  },
  long_hair: {
    long_yellow: ['hair_long_light'],
    long_black: ['hair_long_dark'],
    long_curly: ['hair_long_curly'],
  },
  mouth: {
    smile: ['mouth_smile'],
    flat: ['mouth_flat'],
  },
  shirt: {
    collared_pink: ['shirt_collared_pink'],
    collared_green: ['shirt_collared_green'],
    collared_yellow: ['shirt_collared_yellow'],
    hoodie_down_red: ['shirt_hoodie_down_red', 'shirt_hoodie_red'],
    hoodie_down_pink: ['shirt_hoodie_down_pink', 'shirt_hoodie_pink'],
    collared_white: ['shirt_collared_white'],
    collared_turquoise: ['shirt_collared_turquoise'],
    collared_blue: ['shirt_collared_blue'],
    hoodie_down_white: ['shirt_hoodie_down_white', 'shirt_hoodie_white'],
    hoodie_down_green: ['shirt_hoodie_down_green', 'shirt_hoodie_green'],
    hoodie_down_gray: ['shirt_hoodie_down_dark_gray', 'shirt_hoodie_dark_gray'],
    hoodie_down_blue: ['shirt_hoodie_down_blue', 'shirt_hoodie_blue'],
  },
  short_hair: {
    mohawk_purple: ['hair_short_mohawk_purple'],
    mohawk_red: ['hair_short_mohawk_red'],
    mohawk_pink: ['hair_short_mohawk_pink'],
    mohawk_black: ['hair_short_mohawk_black'],
    mohawk_yellow: ['hair_short_mohawk_yellow'],
    messy_black: ['hair_short_messy_black'],
    mohawk_green: ['hair_short_mohawk_green'],
    messy_yellow: ['hair_short_messy_yellow'],
    mohawk_blue: ['hair_short_mohawk_blue'],
    messy_red: ['hair_short_messy_red'],
    messy_purple: ['hair_short_messy_purple'],
  },
  smoke: {
    pipe: ['smoke_pipe'],
    pipe_brown: ['smoke_pipe_brown'],
    cig_white: ['smoke_cig_white', 'smoke'],
    cig_black: ['smoke_cig_black', 'smoke'],
  },
  type: {
    alien: ['type_alien', 'body', 'heres_my_signature'],
    charcoal: ['type_charcoal', 'body', 'heres_my_signature'],
    ape: ['type_ape', 'body', 'heres_my_signature'],
    plain: ['type_plain', 'body', 'heres_my_signature'],
    zombie: ['type_zombie', 'body', 'heres_my_signature'],
    metal: ['type_metal', 'body_metal', 'heres_my_signature'],
    based: ['type_based_mfer', 'body_mfercoin', 'heres_my_signature'],
  },
};

// ---------------------------------------------------------------------------
// 3D category → OG folder name
// ---------------------------------------------------------------------------
const CATEGORY_FOLDER_MAP = {
  type: 'type',
  eyes: 'eyes',
  headphones: 'headphones',
  hat_over_headphones: 'hat over headphones',
  hat_under_headphones: 'hat under headphones',
  mouth: 'mouth',
  shirt: 'shirt',
  chain: 'chain',
  watch: '4_20 watch',
  beard: 'beard',
  short_hair: 'short hair',
  long_hair: 'long hair',
  smoke: 'smoke',
};

// ---------------------------------------------------------------------------
// Trait ID → OG-style filename (reverse of filenameToTraitId)
// ---------------------------------------------------------------------------
const TRAIT_FILENAME_MAP = {
  type: {
    plain: 'plain mfer.png',
    charcoal: 'charcoal mfer.png',
    ape: 'ape mfer.png',
    alien: 'alien mfer.png',
    zombie: 'zombie mfer.png',
    metal: 'metal mfer.png',
    based: 'based mfer.png',
  },
  headphones: {
    black: 'black headphones.png',
    blue: 'blue headphones.png',
    gold: 'gold headphones.png',
    green: 'green headphones.png',
    lined: 'lined headphones.png',
    pink: 'pink headphones.png',
    red: 'red headphones.png',
    white: 'white headphones.png',
    black_square: 'black square headphones.png',
    blue_square: 'blue square headphones.png',
    gold_square: 'gold square headphones.png',
  },
  eyes: {
    regular: 'regular eyes.png',
    '3d': '3D glasses.png',
    nerd: 'nerd glasses.png',
    shades: 'shades.png',
    purple_shades: 'purple shades.png',
    vr: 'vr.png',
    eye_mask: 'eye mask.png',
    eyepatch: 'eye patch.png',
    matrix: 'matrix shades.png',
    trippy: 'trippy shades.png',
    metal: 'metal eyes.png',
    mfercoin: 'mfercoin eyes.png',
    red: 'red eyes.png',
    alien: 'alien eyes.png',
    zombie: 'zombie eyes.png',
  },
  hat_over_headphones: {
    cowboy: 'cowboy hat.png',
    top: 'top hat.png',
    pilot: 'pilot helmet.png',
    hoodie_gray: 'hoodie gray.png',
    hoodie_pink: 'hoodie pink.png',
    hoodie_red: 'hoodie red.png',
    hoodie_blue: 'hoodie blue.png',
    hoodie_white: 'hoodie white.png',
    hoodie_green: 'hoodie green.png',
    larva_mfer: 'larva mfer.png',
  },
  hat_under_headphones: {
    bandana_blue: 'bandana blue.png',
    bandana_dark_gray: 'bandana dark gray.png',
    bandana_red: 'bandana red.png',
    beanie: 'beanie.png',
    beanie_monochrome: 'beanie monochrome.png',
    cap_monochrome: 'cap monochrome.png',
    cap_purple: 'cap purple.png',
    cap_based_blue: 'cap based blue.png',
    headband_blue_green: 'headband blue_green.png',
    headband_blue_red: 'headband blue_red.png',
    headband_blue_white: 'headband blue_white.png',
    headband_green_white: 'headband green_white.png',
    headband_pink_white: 'headband pink_white.png',
    knit_kc: 'knit kc.png',
    knit_las_vegas: 'knit las vegas.png',
    knit_new_york: 'knit new york.png',
    knit_san_fran: 'knit san fran.png',
    knit_miami: 'knit miami.png',
    knit_chicago: 'knit chicago.png',
    knit_atlanta: 'knit atlanta.png',
    knit_cleveland: 'knit cleveland.png',
    knit_dallas: 'knit dallas.png',
    knit_baltimore: 'knit baltimore.png',
    knit_buffalo: 'knit buffalo.png',
    knit_pittsburgh: 'knit pittsburgh.png',
  },
  mouth: {
    smile: 'smile.png',
    flat: 'flat.png',
  },
  shirt: {
    collared_pink: 'collared shirt pink.png',
    collared_green: 'collared shirt green.png',
    collared_yellow: 'collared shirt yellow.png',
    collared_white: 'collared shirt white.png',
    collared_turquoise: 'collared shirt turquoise.png',
    collared_blue: 'collared shirt blue.png',
    hoodie_down_red: 'hoodie down red.png',
    hoodie_down_pink: 'hoodie down pink.png',
    hoodie_down_white: 'hoodie down white.png',
    hoodie_down_green: 'hoodie down green.png',
    hoodie_down_gray: 'hoodie down gray.png',
    hoodie_down_blue: 'hoodie down blue.png',
  },
  chain: {
    gold: 'gold chain.png',
    silver: 'silver chain.png',
    onchain: 'onchain.png',
  },
  watch: {
    argo_black: 'argo black.png',
    argo_white: 'argo white.png',
    sub_blue: 'sub blue.png',
    sub_black: 'sub black.png',
    sub_red: 'sub red.png',
    sub_rose: 'sub rose.png',
    sub_turquoise: 'sub turquoise.png',
    sub_cola: 'sub cola (blue_red).png',
    sub_bat: 'sub bat (blue_black).png',
    sub_lantern_green: 'sub lantern (green).png',
    oyster_silver: 'oyster silver.png',
    oyster_gold: 'oyster gold.png',
    timex: 'timex.png',
  },
  beard: {
    full: 'full beard.png',
    flat: 'shadow beard.png',
  },
  short_hair: {
    messy_black: 'messy black.png',
    messy_yellow: 'messy yellow.png',
    messy_red: 'messy red.png',
    messy_purple: 'messy purple.png',
    mohawk_black: 'mohawk black.png',
    mohawk_blue: 'mohawk blue.png',
    mohawk_green: 'mohawk green.png',
    mohawk_pink: 'mohawk pink.png',
    mohawk_purple: 'mohawk purple.png',
    mohawk_red: 'mohawk red.png',
    mohawk_yellow: 'mohawk yellow.png',
  },
  long_hair: {
    long_black: 'long hair black.png',
    long_yellow: 'long hair yellow.png',
    long_curly: 'long hair curly.png',
  },
  smoke: {
    cig_black: 'cig black.png',
    cig_white: 'cig white.png',
    pipe: 'pipe.png',
    pipe_brown: 'brown pipe.png',
  },
};

function getFilename(category, traitId) {
  const map = TRAIT_FILENAME_MAP[category];
  if (map && map[traitId]) return map[traitId];
  // Fallback: convert trait_id to spaced filename
  return traitId.replace(/_/g, ' ') + '.png';
}

function getFolderName(category) {
  return CATEGORY_FOLDER_MAP[category] || category.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Build the HTML page with Three.js scene
// ---------------------------------------------------------------------------
function buildHTML() {
  // Camera position: rotated -15 degrees around Y from (-0.3, 1.1, 1.65)
  const angle = -Math.PI / 12;
  const camX = -0.3 * Math.cos(angle) + 1.65 * Math.sin(angle);
  const camZ = 0.3 * Math.sin(angle) + 1.65 * Math.cos(angle);

  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; overflow: hidden; background: transparent; }
  canvas { display: block; }
</style>
</head>
<body>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GLB_URL = '${GLB_URL}';
const CAM_X = ${camX};
const CAM_Z = ${camZ};

let renderer, scene, camera, glbScene;

async function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(${RENDER_SIZE}, ${RENDER_SIZE});
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(CAM_X, 1.1, CAM_Z);
  camera.lookAt(0, 0.9, 0);

  // Lighting (match ThreePreview)
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dir1.position.set(2, 2, 2);
  scene.add(dir1);

  const dir2 = new THREE.DirectionalLight(0xb4c7ff, 0.4);
  dir2.position.set(-1.5, 1, -1);
  scene.add(dir2);

  const spot1 = new THREE.SpotLight(0xffffff, 0.35, 0, 0.6, 1);
  spot1.position.set(0, 2, -2.5);
  scene.add(spot1);

  const point1 = new THREE.PointLight(0xb4c7ff, 0.2, 3);
  point1.position.set(0, 0.5, 1.5);
  scene.add(point1);

  const spot2 = new THREE.SpotLight(0x00ff41, 1.5, 5, Math.PI / 3, 0.8);
  spot2.position.set(0, 2.0, -1.5);
  scene.add(spot2);

  // Load GLB
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load(GLB_URL, resolve, undefined, reject);
  });

  glbScene = gltf.scene;
  scene.add(glbScene);

  // Apply idle animation pose (so meshes render in posed position, not T-pose)
  if (gltf.animations && gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(glbScene);
    const clip = gltf.animations[0];
    const action = mixer.clipAction(clip);
    action.play();
    mixer.update(0); // advance to frame 0 — applies the idle pose
    console.log('Applied animation pose:', clip.name, '(' + gltf.animations.length + ' clips available)');
  }

  // Hide everything initially
  glbScene.traverse(obj => {
    if (obj.isMesh) obj.visible = false;
  });

  // Collect all mesh names for debugging
  const meshNames = [];
  glbScene.traverse(obj => {
    if (obj.isMesh) meshNames.push(obj.name);
  });

  window.__meshNames = meshNames;
  window.__ready = true;
}

window.showMeshes = function(names) {
  glbScene.traverse(obj => {
    if (obj.isMesh) {
      obj.visible = names.includes(obj.name);
    }
  });
  renderer.render(scene, camera);
};

window.getScreenshot = function() {
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
};

init().catch(err => {
  window.__error = err.message;
  console.error(err);
});
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🎨 3D Layer Batch Renderer');
  console.log('Output:', OUTPUT_DIR);
  console.log('');

  // Create output dirs
  for (const category of Object.keys(TRAIT_MESH_MAPPING)) {
    const folder = getFolderName(category);
    fs.mkdirSync(path.join(OUTPUT_DIR, folder), { recursive: true });
  }

  // Write temp HTML
  const tmpHtml = path.join(__dirname, '_render-3d-layers.html');
  fs.writeFileSync(tmpHtml, buildHTML());

  // Launch browser
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=angle', '--use-angle=metal'],
  });
  const context = await browser.newContext({
    viewport: { width: RENDER_SIZE, height: RENDER_SIZE },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Load page and wait for GLB
  console.log('Loading GLB model (this may take a minute)...');
  await page.goto(`file://${tmpHtml}`, { waitUntil: 'domcontentloaded' });

  // Wait for model to load
  await page.waitForFunction('window.__ready === true || window.__error', { timeout: 120000 });

  const error = await page.evaluate('window.__error');
  if (error) {
    console.error('Failed to load GLB:', error);
    await browser.close();
    fs.unlinkSync(tmpHtml);
    process.exit(1);
  }

  const meshNames = await page.evaluate('window.__meshNames');
  console.log(`GLB loaded. ${meshNames.length} meshes found.`);
  console.log('');

  // Count total renders
  let totalTraits = 0;
  for (const cat of Object.keys(TRAIT_MESH_MAPPING)) {
    totalTraits += Object.keys(TRAIT_MESH_MAPPING[cat]).length;
  }

  let rendered = 0;

  // Render each trait
  for (const [category, traits] of Object.entries(TRAIT_MESH_MAPPING)) {
    const folder = getFolderName(category);
    console.log(`\n📁 ${folder}/`);

    for (const [traitId, meshList] of Object.entries(traits)) {
      const filename = getFilename(category, traitId);
      const outPath = path.join(OUTPUT_DIR, folder, filename);

      // Show only this trait's meshes
      await page.evaluate((names) => window.showMeshes(names), meshList);

      // Small delay for render
      await page.waitForTimeout(100);

      // Get screenshot as data URL
      const dataUrl = await page.evaluate(() => window.getScreenshot());
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));

      rendered++;
      console.log(`  ✅ ${filename} (${rendered}/${totalTraits})`);
    }
  }

  console.log(`\n🎉 Done! ${rendered} trait layers rendered.`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // List structure
  console.log('\nFolder structure:');
  for (const category of Object.keys(TRAIT_MESH_MAPPING)) {
    const folder = getFolderName(category);
    const dir = path.join(OUTPUT_DIR, folder);
    const files = fs.readdirSync(dir);
    console.log(`  ${folder}/ (${files.length} files)`);
  }

  await browser.close();
  fs.unlinkSync(tmpHtml);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
