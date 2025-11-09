const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add audio file extensions so Metro can bundle sound effect files
config.resolver.assetExts.push('m4a');

module.exports = config;
