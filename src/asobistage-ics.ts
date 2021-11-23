import { serve } from "https://deno.land/x/sift@0.4.2/mod.ts"
import ics from "https://cdn.skypack.dev/ics"

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/asobistage-ics.ts"
const MAX_AGE = 60 * 60 * 12

const dateToArr = (date: Date) => [
  date.getFullYear(),
  date.getMonth() + 1,
  date.getDate(),
  date.getHours(),
  date.getMinutes(),
]

const handleRequest = async () => {
  const response = await fetch("https://asobistage.asobistore.jp/", {
    headers: {
      "user-agent": `asobistage-ics (+${SOURCE_URL})`,
    },
  })

  if (!response.ok) {
    return new Response("fetch error", {
      status: 500,
    })
  }

  const text = await response.text()
  const json = text.match(/type=\"application\/json">(.+)<\/script>/)?.[1]

  if (!json) {
    return new Response("json not found", {
      status: 500,
    })
  }
  const next: {
    props: {
      pageProps: {
        initialData: {
          contents: {
            id: string
            createdAt: string
            updatedAt: string
            publishedAt: string
            revisedAt: string
            type: string[]
            title: string
            text_eventdate: string
            text_archivedate: string
            listview_date: string
            countdown_live?: string
            ticket_link: string
            official_link: string
            otherLinks: []
            hashEventpage: boolean
            pickup: boolean
          }[]
        }
      }
    }
  } = JSON.parse(json)

  const { error, value } = ics.createEvents(
    next.props.pageProps.initialData.contents
      .filter((item) => item.countdown_live)
      .map((item) => {
        return {
          uid: item.id,
          start: dateToArr(new Date(item.countdown_live!)),
          created: dateToArr(new Date(item.createdAt)),
          lastModified: dateToArr(new Date(item.revisedAt)),
          duration: { hours: 1 },
          title: item.title,
          url: item.ticket_link?.startsWith("/")
            ? `https://asobistage.asobistore.jp${item.ticket_link}`
            : item.ticket_link,
          productId: "asobistage/ics",
        }
      })
  )
  if (error) {
    console.error(error)
    return new Response("ical generation error", {
      status: 500,
    })
  }

  return new Response(value, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": `max-age=${MAX_AGE}`,
    },
  })
}

serve({
  "/": () => new Response(`asobistage-ics: /calendar.ics (+${SOURCE_URL})`),
  "/calendar.ics": handleRequest,
})
