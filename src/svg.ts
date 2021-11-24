import { serve } from "https://deno.land/x/sift@0.4.2/mod.ts"
import * as $ from "https://deno.land/x/zod@v3.11.6/mod.ts"

const M3O_KEY = Deno.env.get("M3O_KEY")
const FILE_PROJECT = Deno.env.get("FILE_PROJECT")
if (!M3O_KEY || !FILE_PROJECT) {
  throw new Error("env missing")
}

const handleRequest = async (_: Request, params: unknown) => {
  const parsedParams = await $.object({
    name: $.string().min(1),
  }).safeParseAsync(params)
  if (parsedParams.success === false) {
    return new Response(JSON.stringify(parsedParams.error), {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    })
  }
  const { name } = parsedParams.data

  const response = await fetch("https://api.m3o.com/v1/file/Read", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${M3O_KEY}`,
    },
    method: "POST",
    body: JSON.stringify({
      path: `/${name}.svg`,
      project: FILE_PROJECT,
    }),
  })

  if (!response.ok) {
    return new Response("external server error", {
      status: 500,
    })
  }

  const json = await response.json()
  const file: Read | undefined = json.file

  if (!file) {
    return new Response("image not found", {
      status: 404,
    })
  }

  return new Response(file.content, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
    },
  })
}

serve({
  "/": () => new Response(`svg testing 1.2.3...`),
  "/:name.svg": handleRequest,
})

type Read = {
  project: string
  content: string
  path: string
  created: string
  updated: string
}
