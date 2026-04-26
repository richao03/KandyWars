/**
 * Generates static JSON data files from game source code for the docs site.
 * Run: node scripts/generateGameData.js (from docs-site/)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'data');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// ===== Extract Joker Data =====
function extractJokers() {
  const engineCode = fs.readFileSync(path.join(ROOT, 'src', 'utils', 'jokerEffectEngine.ts'), 'utf-8');
  const idsCode = fs.readFileSync(path.join(ROOT, 'src', 'constants', 'jokerIds.ts'), 'utf-8');
  const iconsCode = fs.readFileSync(path.join(ROOT, 'utils', 'jokerIcons.ts'), 'utf-8');

  // Extract icon filenames — handle both single and double quoted keys
  const iconMap = {};
  let m;
  // Double-quoted keys (may contain apostrophes): "Teacher's Spy"
  const dqIconRegex = /"([^"]+)":\s*require\(['"]\.\.\/assets\/images\/emojis\/([^'"]+)['"]\)/g;
  while ((m = dqIconRegex.exec(iconsCode)) !== null) {
    iconMap[m[1]] = m[2];
  }
  // Single-quoted keys: 'Double Up'
  const sqIconRegex = /'([^']+)':\s*require\(['"]\.\.\/assets\/images\/emojis\/([^'"]+)['"]\)/g;
  while ((m = sqIconRegex.exec(iconsCode)) !== null) {
    iconMap[m[1]] = m[2];
  }
  // Unquoted keys: Diversifier
  const uqIconRegex = /(\w[\w\s]*\w|\w):\s*require\(['"]\.\.\/assets\/images\/emojis\/([^'"]+)['"]\)/g;
  while ((m = uqIconRegex.exec(iconsCode)) !== null) {
    if (!iconMap[m[1]]) iconMap[m[1]] = m[2];
  }

  // Strip [xMult] / [+Profit] bucket tags from description (game UI strips these).
  function stripBucketTag(raw) {
    return (raw || '').replace(/^\[(?:xMult|\+Profit)\]\s*/, '');
  }

  // Parse ALL "X/Y/Z" ladders in a description and return the text as shown at a specific level.
  // Some jokers have multiple ladders — e.g., Perfect Bake: "$1k/$3k/$5k cash ... + 7/15/36 slots"
  // at L2 should render "$3k cash ... + 15 slots".
  // Descriptions without any ladder return unchanged.
  function descriptionAtLevel(rawDescription, level, maxLevel) {
    const cleaned = stripBucketTag(rawDescription);
    if (!cleaned) return '';
    if (level > maxLevel) return cleaned;
    // Match every \S+/\S+/\S+ triplet globally and replace each with its level-N value.
    return cleaned.replace(/(\S+)\/(\S+)\/(\S+)/g, (_m, a, b, c) => {
      const value = [a, b, c][level - 1];
      return value !== undefined ? value : _m;
    });
  }

  // Extract jokers — find each makeJoker block and parse fields individually.
  // Tolerates both `makeJoker({...})` (legacy inline) and `makeJoker(\n  {...}\n, ...)` (multiline).
  const jokers = [];
  const blockRegex = /makeJoker\(\s*\{([^}]+)\}/g;

  while ((m = blockRegex.exec(engineCode)) !== null) {
    const block = m[1];
    const id = block.match(/id:\s*(\d+)/)?.[1];
    // Handle double-quoted names first (contain apostrophes), then single-quoted
    const name = block.match(/name:\s*"([^"]+)"/)?.[1] || block.match(/name:\s*'([^']+)'/)?.[1];
    const type = block.match(/type:\s*'([^']+)'/)?.[1];
    const maxLevel = block.match(/maxLevel:\s*(\d+)/)?.[1];
    const flavorText = (block.match(/flavorText:\s*'((?:[^'\\]|\\.)*)'/)?.[1] || '').replace(/\\'/g, "'");
    const description = block.match(/description:\s*'([^']*)'/)?.[1];

    if (id && name && type) {
      const lv = parseInt(maxLevel || '1');
      const canLevel = lv > 1;
      const typeLabel = type === 'persistent' ? 'Aura' : 'Instant';
      // Per-level descriptions mirror what the JokerCard shows when owned at that level.
      // For non-levelable jokers, all three keys are the same.
      const perLevelDescriptions = {
        1: descriptionAtLevel(description, 1, lv),
        2: descriptionAtLevel(description, 2, lv),
        3: descriptionAtLevel(description, 3, lv),
      };
      jokers.push({
        id: parseInt(id),
        name,
        type,
        typeLabel,
        maxLevel: lv,
        flavorText: flavorText || '',
        description: description || '',
        descriptionStripped: stripBucketTag(description),
        perLevelDescriptions,
        icon: iconMap[name] || Object.entries(iconMap).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] || null,
        canLevel,
      });
    }
  }

  jokers.sort((a, b) => a.id - b.id);
  fs.writeFileSync(path.join(OUT_DIR, 'jokers.json'), JSON.stringify(jokers, null, 2));
  console.log(`Generated ${jokers.length} jokers → src/data/jokers.json`);
}

// ===== Extract Hall Pass Data =====
function extractHallPasses() {
  const code = fs.readFileSync(path.join(ROOT, 'src', 'store', 'slices', 'hallPassSlice.ts'), 'utf-8');
  const passes = [];

  // Match each hall pass object block (between { id: and rarity: 'xxx' })
  const blockRegex = /\{\s*\n?\s*id:\s*'([^']+)'[\s\S]*?rarity:\s*'([^']+)'/g;

  let m;
  while ((m = blockRegex.exec(code)) !== null) {
    const block = m[0];
    const id = m[1];
    const rarity = m[2];

    const name = (block.match(/name:\s*['"]([^'"]+)['"]/)?.[1] || '');
    const description = (block.match(/description:\s*['"]([^'"]+)['"]/)?.[1] || '');
    const unlockRequirement = (block.match(/unlockRequirement:\s*'([^']+)'/)?.[1] || '');

    const effects = [];
    const effectRegex = /type:\s*'([^']+)',\s*\n\s*value:\s*(\d+),\s*\n\s*description:\s*['"]([^'"]+)['"]/g;
    let em;
    while ((em = effectRegex.exec(block)) !== null) {
      effects.push({
        type: em[1],
        value: parseInt(em[2]),
        description: em[3],
      });
    }

    // Also handle multi-line descriptions with template-style strings
    if (effects.length === 0) {
      const singleEffectRegex = /type:\s*'([^']+)',\s*\n\s*value:\s*(\d+),\s*\n\s*description:\s*\n?\s*['"]([^'"]+)['"]/g;
      while ((em = singleEffectRegex.exec(block)) !== null) {
        effects.push({
          type: em[1],
          value: parseInt(em[2]),
          description: em[3],
        });
      }
    }

    passes.push({ id, name, description, unlockRequirement, effects, rarity });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'hallPasses.json'), JSON.stringify(passes, null, 2));
  console.log(`Generated ${passes.length} hall passes → src/data/hallPasses.json`);
}

// ===== Extract Candy Data =====
function extractCandy() {
  const code = fs.readFileSync(path.join(ROOT, 'src', 'constants', 'candyRegistry.ts'), 'utf-8');
  const candies = [];

  const candyRegex = /\{\s*name:\s*'([^']+)',\s*size:\s*'([^']+)',\s*types:\s*\['([^']+)',\s*'([^']+)'\],\s*baseMin:\s*([\d.]+),\s*baseMax:\s*([\d.]+)\s*\}/g;
  let m;
  while ((m = candyRegex.exec(code)) !== null) {
    candies.push({
      name: m[1],
      size: m[2],
      types: [m[3], m[4]],
      baseMin: parseFloat(m[5]),
      baseMax: parseFloat(m[6]),
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'candy.json'), JSON.stringify(candies, null, 2));
  console.log(`Generated ${candies.length} candies → src/data/candy.json`);
}

extractJokers();
extractHallPasses();
extractCandy();
console.log('\nDone!');
