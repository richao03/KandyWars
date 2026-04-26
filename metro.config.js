const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add audio file extensions so Metro can bundle sound effect files
config.resolver.assetExts.push('m4a');

// Exclude docs-site from Metro bundler — it has its own build system (Docusaurus)
const { blockList } = config.resolver;
const docsBlockRegex = new RegExp(path.resolve(__dirname, 'docs-site').replace(/[/\\]/g, '[/\\\\]') + '/.*');
if (blockList instanceof RegExp) {
  config.resolver.blockList = [blockList, docsBlockRegex];
} else if (Array.isArray(blockList)) {
  config.resolver.blockList = [...blockList, docsBlockRegex];
} else {
  config.resolver.blockList = [docsBlockRegex];
}

module.exports = config;
