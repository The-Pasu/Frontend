import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "MG Extension",
    web_accessible_resources: [
      {
        resources: ["inject.js"],
        matches: ["*://*.instagram.com/*", "*://*.web.telegram.org/*", "*://*.danggeun.com/*"]
      }
    ]
  },
});
