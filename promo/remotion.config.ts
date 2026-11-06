// Options for `remotion studio` and `remotion render`.
// https://www.remotion.dev/docs/config
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
