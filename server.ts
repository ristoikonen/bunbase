// @ts-ignore Bun provides this module at runtime; its types may not be installed in the editor.
import { serve, type BunRequest } from "bun";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { generateGeminiContent } from "./services/ask_gemini";
import { checkAndIncrementUsage } from "./services/dbratelimiter";
import type { ChatApiResponse, ChatRequestPayload } from "./models/chatresponses";
import { handleM2131Telemetry } from "./middleware/m2131Logger";
import { generateIPHash } from "./utils/hash";
import { jsonResponse, errorResponse } from "./utils/response";

const imageDir = "./images";
const textDir = "./textfiles";
const thumbDir = "./thumbnails";


// Define the generic structure with a sequential integer ID
interface DataItem<K = string, V = string> {
  id: number; // Enforced as an integer
  fieldKey: K;
  fieldValue: V;
  fieldText: string;
}


(async function main() {
  // inits here
  await mkdir(imageDir, { recursive: true });
  await mkdir(textDir, { recursive: true });
  await mkdir(thumbDir, { recursive: true });

  const port = Number(Bun.env.APP_PORT ?? 3000);
  const host = Bun.env.APP_HOST ?? "localhost";
  const apiKey = Bun.env.GEMINI_API_KEY;
  if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  //const ai = new GoogleGenAI();

  const server = serve({
    port: port,
    routes: {
      // Frontend UI at root and index.html are the same
      "/": () => {
        const file = Bun.file("./public/images.html");
        return file.exists().then((exists) => 
          exists 
            ? new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } })
            : errorResponse("Frontend UI index.html not found", 404)
        );
      },
      "/index.html": () => {
        const file = Bun.file("./public/images.html");
        return file.exists().then((exists) => 
          exists 
            ? new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } })
            : errorResponse("Frontend UI index.html not found", 404)
        );
      },
      "/imagestext.html": () => {
        const file = Bun.file("./public/imagestext.html");
        return file.exists().then((exists) =>
          exists
            ? new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } })
            : errorResponse("Frontend UI imagestext.html not found", 404)
        );
      },

      // API Endpoint: Dynamic lookup of your local images directory
      "/api/images": {
        GET: async () => {
          try {
            const imagefiles = await readdir(imageDir);
            const textfiles = await readdir(textDir);
            
            // filter for standard image formats
            const validImages = imagefiles.filter((file) =>
              /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)
            ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

            const validTexts = textfiles.filter((file) =>
              /\.(txt|json)$/i.test(file)
            ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

            //console.log(validImages);
            //console.log(validTexts);

            
            const keys: string[] = validTexts;

            const values: string[] = validImages; //["Admin", "Senior Developer", "Editor"];

            const dataArray: DataItem[] = await Promise.all(keys.map(async (key, index) => ({
              id: index + 1, // counter from 1
              fieldKey: key,  //as we map keys
              fieldValue: values[index] ?? "",
              fieldText: await readFile(join(textDir, key), "utf8")
            })));

            const jsonString: string = JSON.stringify(dataArray, null, 2);
            console.log(jsonString);

            return jsonResponse(dataArray, 200, true);
          } catch (err: any) {
            console.error("[Directory Read Error]:", err.message || err);
            return errorResponse("Failed to index local image directory", 500, true);
          }
        }
      },

      // Main API Endpoint wrapped with M-21-31 Telemetry middleware
      "/api/chat": {
        POST: async (req: BunRequest) => {
          return handleM2131Telemetry(req, async (innerReq: BunRequest) => {
            try {
              // ... your existing chat handler code ...
              return jsonResponse("", 200, true);
            } catch (err: any) {
              console.error("[Error]:", err.message || err);
              return jsonResponse({
                success: false,
                error: "An internal error occurred while processing your request. Please try again later.",
              }, 500, true);
            }
          });
        },
      },
    },

    // Global catch-all block handles dynamic parameterized paths (/images/photo.jpg)
    async fetch(req: BunRequest) {
      const url = new URL(req.url);

      // Handle asset matching for dynamic image files
      if (url.pathname.startsWith("/images/")) {
        const filename = url.pathname.replace("/images/", "");
        
        // Block path traversal attempts (security protection)
        if (filename.includes("..") || filename.includes("/")) {
          return errorResponse("Forbidden", 403, true);
        }

        const filePath = join(imageDir, filename);
        const imageFile = Bun.file(filePath);

        // Native async file existence check using Bun.file API
        if (await imageFile.exists()) {
          // Optional: Intercept query parameters here if utilizing on-the-fly resizing transformations via Bun.Image
          return new Response(imageFile);
        } else {
          return errorResponse("Media asset not found", 404, true);
        }
      }

      // Default route-table mismatch fallback
      return errorResponse("Not Found", 404, true);
    },
  });
 

})().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

console.log(`Bun API running.`);
