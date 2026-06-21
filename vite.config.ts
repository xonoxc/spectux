import { defineConfig } from "vite"
import path from "node:path"
import { devtools } from "@tanstack/devtools-vite"

import { tanstackStart } from "@tanstack/react-start/plugin/vite"

import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"
import babel from "@rolldown/plugin-babel"

const config = defineConfig({
   resolve: {
      tsconfigPaths: true,
      alias: {
         "~": path.resolve(process.cwd(), "packages/editor-core/src"),
         shared: path.resolve(process.cwd(), "shared"),
      },
   },
   plugins: [
      devtools(),
      nitro({ rollupConfig: { external: [/^@sentry\//] } }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
      babel({
         presets: [
            reactCompilerPreset({
               target: "19",
            }),
         ],
      }),
   ],
})

export default config
