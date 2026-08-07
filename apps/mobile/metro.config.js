const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// SDK 57 detecta o monorepo npm sozinho (watchFolders/nodeModulesPaths).
const config = getDefaultConfig(__dirname);

// Migrations do Drizzle são importadas como texto (babel inline-import).
config.resolver.sourceExts.push("sql");

module.exports = withNativeWind(config, { input: "./src/global.css" });
