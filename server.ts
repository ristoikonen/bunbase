// @ts-ignore Bun provides this module at runtime; its types may not be installed in the editor.
import { serve, type BunRequest } from "bun";
//import { mkdir, readFile, readdir } from "node:fs/promises";

//import { generateGeminiContent } from "./services/ask_gemini";
//import { checkAndIncrementUsage } from "./services/dbratelimiter";
import { handleM2131Telemetry } from "./middleware/m2131Logger";
//import { generateIPHash } from "./utils/hash";
import { jsonResponse, errorResponse } from "./utils/response";

//const imageDir = "./images";


(async function main() {
  // inits here
  //await mkdir(imageDir, { recursive: true });


  const port = Number(Bun.env.APP_PORT ?? 3000);
  const host = Bun.env.APP_HOST ?? "localhost";

  //const apiKey = Bun.env.GEMINI_API_KEY;
  //if (!apiKey) {
  //    throw new Error("Missing GEMINI_API_KEY environment variable.");
  //}
  //const ai = new GoogleGenAI();

  const server = serve({
    port: port,
    routes: {
      // Frontend UI at root and index.html are the same
      "/": () => {
        const file = Bun.file("./public/index.html");
        return file.exists().then((exists) => 
          exists 
            ? new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } })
            : errorResponse("Index.html not found", 404)
        );
      },
      "/index.html": () => {
        const file = Bun.file("./public/index.html");
        return file.exists().then((exists) => 
          exists 
            ? new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } })
            : errorResponse("Index.html not found", 404)
        );
      },
      

      // Main API Endpoint wrapped with M-21-31 Telemetry middleware
      "/api/log": {
        POST: async (req: BunRequest) => {
          return handleM2131Telemetry(req, async (innerReq: BunRequest) => {
            try {
              // ... code here ...
              return jsonResponse("/api/log", 200, true);
            } catch (err: any) {
              console.error("[Error]:", err.message || err);
              return jsonResponse({
                success: false,
                error: "An internal error occurred while processing your request. Please try again later.",
              }, 404, true);
            }
          });
        },
      },
    },

    async fetch(req: BunRequest) {
      return jsonResponse("", 200, false);
    }
  });
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

console.log(`Bun API running. If local use:  http://localhost:3000`);
