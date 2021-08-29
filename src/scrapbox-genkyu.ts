import { serve } from "https://deno.land/x/sift@0.3.5/mod.ts"
import * as $ from "https://deno.land/x/zod@v3.8.0/mod.ts"
import { parseFeed } from "https://deno.land/x/rss@0.5.3/mod.ts"
import { Feed } from "https://jspm.dev/feed@4.2.2"

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/scrapbox-genkyu.ts"

const handleRequest = async (_: Request, params: unknown) => {
  const parsedParams = await $.object({
    projectId: $.string().min(1),
    keyword: $.string().min(1),
  }).safeParseAsync(params)
  if (parsedParams.success === false) {
    return new Response(JSON.stringify(parsedParams.error), {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    })
  }
  const { projectId, keyword } = parsedParams.data
  const decodedKeyword = decodeURIComponent(keyword)

  const response = await fetch(`https://scrapbox.io/api/feed/${projectId}`, {
    headers: {
      "user-agent": `scrapbox-genkyu (+${SOURCE_URL})`,
    },
  })

  if (!response.ok) {
    return new Response("fetch error", {
      status: 500,
    })
  }

  const text = await response.text()
  const parsed = await parseFeed(text)

  const feed = new Feed({
    id: parsed.id,
    title: `${decodedKeyword} in ${parsed.title.value}`,
    description: parsed.description,
    link: parsed.links[0],
    updated: parsed.updateDate,
    generator: `scrapbox-genkyu (+${SOURCE_URL})`,
  })

  parsed.entries
    .filter(
      (entry) =>
        decodeURIComponent(entry.id).includes(decodedKeyword) ||
        entry.title?.value?.includes(decodedKeyword) ||
        entry.description?.value?.includes(decodedKeyword)
    )
    .forEach((entry) => {
      feed.addItem({
        id: entry.id,
        title: entry.title?.value,
        description: entry.description?.value,
        link: entry.links[0].href,
        date: entry.published,
      })
    })

  return new Response(feed.rss2(), {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  })
}

serve({
  "/": () =>
    new Response(`scrapbox-genkyu: /:projectId/:keyword (+${SOURCE_URL})`),
  "/:projectId/:keyword": handleRequest,
})
