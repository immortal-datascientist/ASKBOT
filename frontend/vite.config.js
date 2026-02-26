import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 👇 set YOUR LAN IP here
const LAN_IP = "192.168.1.100"; // <--- replace with your ipconfig IPv4

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",      // listen on all interfaces
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: LAN_IP,       // critical: other devices connect to this for HMR
      port: 5173,
    },
    proxy: {
      "/api": { target: "http://192.168.1.100:5000", changeOrigin: true },
      "/pdfs": { target: "http://192.168.1.100:5000", changeOrigin: true },
      "/Training_docs_videos": { target: "http://192.168.1.100:5000", changeOrigin: true },
    },
  },
});
