const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// SDK 57 detecta o monorepo npm sozinho (watchFolders/nodeModulesPaths).
const config = getDefaultConfig(__dirname);

// Migrations do Drizzle são importadas como texto (babel inline-import).
config.resolver.sourceExts.push("sql");

// Na máquina de dev os node_modules são junctions pra fora do OneDrive (o OneDrive
// transforma as pastas em reparse points e derruba o watcher do Metro). O Metro então
// resolve parte dos módulos pelo caminho da junction e parte pelo caminho real, e o
// mesmo pacote entra duas vezes no bundle. Quem quebra é o NativeWind: o CSS gerado
// mora no caminho real e registra os estilos numa cópia do runtime diferente da que os
// componentes leem, e a tela sai sem estilo. Canonizamos tudo pelo caminho real.
// Sem junction (EAS, CI) a lista fica vazia e nada muda.
function withRealNodeModulesPaths(metroConfig) {
  const key = (p) => (process.platform === "win32" ? p.toLowerCase() : p);
  const aliases = [path.resolve(__dirname, "../.."), __dirname]
    .map((dir) => path.join(dir, "node_modules"))
    .filter((linkPath) => fs.existsSync(linkPath))
    .map((linkPath) => [linkPath + path.sep, fs.realpathSync(linkPath) + path.sep])
    .filter(([linkPath, realPath]) => key(linkPath) !== key(realPath));
  if (aliases.length === 0) return metroConfig;

  const resolveRequest = metroConfig.resolver.resolveRequest;
  return {
    ...metroConfig,
    resolver: {
      ...metroConfig.resolver,
      resolveRequest(context, moduleName, platform) {
        const resolution = (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
        if (resolution.type !== "sourceFile") return resolution;
        const alias = aliases.find(([linkPath]) => key(resolution.filePath).startsWith(key(linkPath)));
        if (!alias) return resolution;
        return { ...resolution, filePath: alias[1] + resolution.filePath.slice(alias[0].length) };
      },
    },
  };
}

module.exports = withRealNodeModulesPaths(withNativeWind(config, { input: "./src/global.css" }));
