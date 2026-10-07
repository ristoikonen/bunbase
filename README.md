# Bunbase

TEMPLATE FOR BUN APPS.

## Installation


To install dependencies:

```bash
bun install
```

To run my dev script of tsconfig with hot HTTP server reloading( --hot server.ts):

```bash

bun run dev
```
Not so hot..

```bash

bun run start
```

## Build a Windows executable

On Windows with Bun installed, compile the server into `bunbase.exe`:

```powershell
bun run build:windows
```

Run `bunbase.exe` from the project directory. The server still reads `public/`, `images/`, and `textfiles/` at runtime, and requires its environment configuration (for example `GEMINI_API_KEY`), so keep those files and folders alongside the executable. Do not distribute a `.env` file containing secrets; configure required environment variables securely on the target machine.

Clone the repository

```bash
   git clone https://github.com/ristoikonen/bunbase.git
   cd bunbase
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Image ordering

The `GET /api/images` endpoint returns supported image filenames in ascending, case-insensitive natural order. Numeric portions are compared by value, so `image2.jpg` appears before `image10.jpg`. The slideshow displays images in the order returned by this endpoint.
