import express from "express";
import path from "path";
import app from "./server.js";

// This entry point is used for local dev (tsx) and self-hosting (node dist/server.cjs).
// It is intentionally never imported by api/index.ts: Vercel's Function bundler
// statically resolves dynamic imports at build time regardless of runtime guards,
// so pulling `vite` (a devDependency with native sub-dependencies) into that bundle
// would crash the deployed function even though this branch never runs on Vercel.
const PORT = 3000;

async function startDevServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startDevServer().catch((err) => {
  console.error("Failed to initialize dev server:", err);
});
