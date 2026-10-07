// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  /** @type {import('expo/metro-config').MetroConfig} */
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
  };
  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...resolver.sourceExts, "svg"],
  };

  // expo-sqlite
  // Add wasm asset support
  config.resolver.assetExts.push("wasm");

  // Add COEP and COOP headers to support SharedArrayBuffer
  config.server.enhanceMiddleware = (middleware) => {
    return (req, res, next) => {
      res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      middleware(req, res, next);
    };
  };

  return config;
})();
