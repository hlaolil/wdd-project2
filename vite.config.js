import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/",
  publicDir: "./public",
  build: {
    outDir: "../dist",    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        cart: resolve(__dirname, "src/cart/index.html"),
        checkout: resolve(__dirname, "src/checkout/index.html"),
        checkoutSuccess: resolve(__dirname, "src/checkout/success.html"),
        productDetail: resolve(__dirname, "src/product_pages/index.html"),
        productListing: resolve(__dirname, "src/product-listing/index.html"),
      },
    },// Ensure static assets are copied to dist
    assetsInclude: ["**/*.json", "**/*.svg"],
    copyPublicDir: true,
  },
});
