import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://invest.autotrading.ua",
  output: "static",
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes("/admin/"),
    }),
  ],
});
