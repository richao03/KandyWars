#!/usr/bin/env node
/**
 * Color Migration Script
 *
 * Automatically replaces hardcoded color values with imports from the consolidated color palette.
 * This script handles the high-impact colors first (white, brown, gray, gold).
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Color mapping: old color -> new color constant path
const colorReplacements = {
  // Whites
  '#ffffff': 'colors.white',
  '#fff': 'colors.white',
  '#FFFFFF': 'colors.white',
  '#FFF': 'colors.white',
  '#f8f9fa': 'colors.offWhite',
  '#f9f9f9': 'colors.offWhite',
  '#f5f5f5': 'colors.gray.bg',
  '#f0f0f0': 'colors.gray.bg',

  // Blacks
  '#000000': 'colors.black',
  '#000': 'colors.black',
  '#1a1a1a': 'colors.darkGray1',
  '#2a2a2a': 'colors.darkGray2',
  '#2c2c2c': 'colors.darkGray2',

  // Browns (candy theme)
  '#6b4423': 'colors.brown.primary',
  '#8B4513': 'colors.brown.secondary',
  '#8b4513': 'colors.brown.secondary',

  // Grays
  '#333': 'colors.gray.dark',
  '#333333': 'colors.gray.dark',
  '#666': 'colors.gray.medium',
  '#666666': 'colors.gray.medium',
  '#999': 'colors.gray.light',
  '#999999': 'colors.gray.light',
  '#ccc': 'colors.gray.border',
  '#cccccc': 'colors.gray.border',
  '#CCC': 'colors.gray.border',

  // Golds
  '#f7e98e': 'colors.gold.light',
  '#d4af37': 'colors.gold.medium',
  '#FFD700': 'colors.gold.medium',
  '#ffd700': 'colors.gold.medium',
  '#f5f5dc': 'colors.gold.beige',
  '#F5F5DC': 'colors.gold.beige',

  // Greens
  '#22c55e': 'colors.green.success',
  '#28a745': 'colors.green.success',
  '#4CAF50': 'colors.green.success',
  '#00ff41': 'colors.green.neon',
  '#00FF00': 'colors.green.neon',
  '#2d4a3e': 'colors.green.darkBg',

  // Reds
  '#dc2626': 'colors.red.error',
  '#ef4444': 'colors.red.error',
  '#e74c3c': 'colors.red.error',
  '#991b1b': 'colors.red.dark',

  // Orange
  '#ff6b35': 'colors.orange.primary',

  // Blues
  '#00d4ff': 'colors.blue.cyan',
  '#3b82f6': 'colors.blue.primary',
  '#2196f3': 'colors.blue.primary',
  '#2196F3': 'colors.blue.primary',
  '#90caf9': 'colors.blue.lightBg',
  '#16213e': 'colors.blue.darkBg',

  // Purples
  '#7851A9': 'colors.purple.primary',
  '#b8a9c9': 'colors.purple.light',
  '#2a1845': 'colors.purple.darkBg',
  '#ec4899': 'colors.purple.hotPink',
};

// Files to process (app directory and components)
const directoriesToScan = [
  'app',
  'src/components',
];

async function findFilesWithColors() {
  console.log('🔍 Scanning for TypeScript/TSX files with hardcoded colors...\n');

  const files = [];

  for (const dir of directoriesToScan) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      const { stdout } = await execPromise(
        `find "${fullPath}" -type f \\( -name "*.tsx" -o -name "*.ts" \\) | head -50`
      );
      files.push(...stdout.trim().split('\n').filter(Boolean));
    }
  }

  return files;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let replacementCount = 0;

  // Check if file already imports colors
  const hasColorImport = content.includes("from '../../src/constants/colors'") ||
                        content.includes("from '../src/constants/colors'") ||
                        content.includes("from './constants/colors'");

  // Track which color categories are used
  const usedColorCategories = new Set();

  // Replace color values
  for (const [oldColor, newColor] of Object.entries(colorReplacements)) {
    // Match color: 'value' or backgroundColor: 'value' or borderColor: 'value'
    const patterns = [
      new RegExp(`(color:\\s*['"])${oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'gi'),
      new RegExp(`(backgroundColor:\\s*['"])${oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'gi'),
      new RegExp(`(borderColor:\\s*['"])${oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'gi'),
      new RegExp(`(shadowColor:\\s*['"])${oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'gi'),
      new RegExp(`(textShadowColor:\\s*['"])${oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'gi'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, `$1${newColor}$2`);
        modified = true;
        replacementCount++;

        // Track category (brown, gold, gray, etc.)
        const category = newColor.split('.')[1];
        if (category) usedColorCategories.add(category);
      }
    }
  }

  if (modified && !hasColorImport) {
    // Add import at the top, after existing imports
    const importStatement = "import colors from '../../src/constants/colors';\n";

    // Find the last import statement
    const importRegex = /^import .+ from .+;$/gm;
    const matches = [...content.matchAll(importRegex)];

    if (matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      const lastImportEnd = lastImport.index + lastImport[0].length;
      content = content.slice(0, lastImportEnd) + '\n' + importStatement + content.slice(lastImportEnd);
    } else {
      // No imports found, add at the top
      content = importStatement + '\n' + content;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { modified: true, replacementCount, categories: Array.from(usedColorCategories) };
  }

  return { modified: false, replacementCount: 0, categories: [] };
}

async function main() {
  console.log('🎨 CandyWarz Color Migration Tool\n');
  console.log('This script will replace hardcoded colors with the consolidated color palette.\n');

  const files = await findFilesWithColors();
  console.log(`Found ${files.length} files to process\n`);

  let totalModified = 0;
  let totalReplacements = 0;
  const modifiedFiles = [];

  for (const file of files) {
    const result = processFile(file);
    if (result.modified) {
      totalModified++;
      totalReplacements += result.replacementCount;
      modifiedFiles.push({
        path: file,
        count: result.replacementCount,
        categories: result.categories
      });
      console.log(`✅ ${path.basename(file)} - ${result.replacementCount} replacements (${result.categories.join(', ')})`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${totalModified}`);
  console.log(`   Total replacements: ${totalReplacements}`);

  if (modifiedFiles.length > 0) {
    console.log(`\n📝 Modified files:`);
    modifiedFiles.forEach(({ path: filePath, count }) => {
      console.log(`   ${filePath.replace(process.cwd(), '.')} (${count} changes)`);
    });
  }

  console.log(`\n✨ Color migration complete!`);
}

main().catch(console.error);
