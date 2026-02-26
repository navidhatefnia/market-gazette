import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Change this to match your GitHub repository name.
    // e.g. if your repo URL is https://github.com/navid/market-gazette
    // then base should be "/market-gazette/"
    base: "/market-gazette/",
});
