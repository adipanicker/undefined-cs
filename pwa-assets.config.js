import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: "#FFD966", fit: "contain" },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { background: "#FFD966", fit: "contain" },
    },
  },
  images: ["public/icon.svg"],
});
