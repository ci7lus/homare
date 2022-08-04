import { serve } from "https://deno.land/x/sift@0.4.2/mod.ts";
import ics from "https://cdn.skypack.dev/ics";
import { DateTime, datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/asobistage-ics.ts";
const MAX_AGE = 60 * 60 * 12;

const dateToArr = (d: DateTime) => {
  const date = d.toDateObj();
  return [date.year, date.month, date.day, date.hour, date.minute];
};

const handleRequest = async () => {
  const response = await fetch("https://asobistage.asobistore.jp/", {
    headers: {
      "user-agent": `asobistage-ics (+${SOURCE_URL})`,
    },
  });

  if (!response.ok) {
    return new Response("fetch error", {
      status: 500,
    });
  }

  const text = await response.text();
  const json = text.match(/type=\"application\/json">(.+)<\/script>/)?.[1];

  if (!json) {
    return new Response("json not found", {
      status: 500,
    });
  }
  const next: {
    props: {
      pageProps: {
        initialData: {
          contents: {
            id: string;
            createdAt: string;
            updatedAt: string;
            publishedAt: string;
            revisedAt: string;
            type: string[];
            title: string;
            text_eventdate: string;
            text_archivedate: string;
            listview_date: string;
            countdown_live?: string;
            ticket_link: string;
            official_link: string;
            otherLinks: [];
            hashEventpage: boolean;
            pickup: boolean;
          }[];
        };
      };
    };
  } = JSON.parse(json);

  const { error, value } = ics.createEvents(
    next.props.pageProps.initialData.contents
      .filter((item) => item.countdown_live)
      .map((item) => {
        const countdown = datetime(item.countdown_live!, {
          timezone: "UTC",
        }).toZonedTime("Asia/Tokyo");
        const created = datetime(item.createdAt, {
          timezone: "UTC",
        }).toZonedTime("Asia/Tokyo");
        const lastModified = datetime(item.revisedAt, {
          timezone: "UTC",
        }).toZonedTime("Asia/Tokyo");
        return item.listview_date
          .split(/・|〜|~|-/)
          .map((dateStr, idx) => {
            const dateIdent = dateStr
              .split(/\.|\//)
              .map((n) => parseInt(n.trim()));
            let year: number;
            let month: number;
            let day: number;
            if (3 <= dateIdent.length) {
              if (3 < dateIdent.length) {
                console.warn(`Unexpected splitter: ${dateStr}`);
              }
              [year, month, day] = dateIdent;
            } else if (2 === dateIdent.length) {
              year = countdown.year;
              [month, day] = dateIdent;
            } else {
              year = countdown.year;
              month = countdown.month;
              [day] = dateIdent;
            }
            const target = datetime(item.countdown_live!, {
              timezone: "UTC",
            })
              .toZonedTime("Asia/Tokyo")
              .toDateObj();
            target.year = year;
            target.month = month;
            target.day = day;
            return [datetime(target, { timezone: "Asia/Tokyo" }), idx] as const;
          })
          .map(([datetime, idx]) => ({
            uid: item.id + "-" + idx,
            start: dateToArr(datetime),
            created: dateToArr(created),
            lastModified: dateToArr(lastModified),
            duration: { hours: 1 },
            title: `${item.title} (Day ${idx + 1})`,
            url: item.ticket_link?.startsWith("/")
              ? `https://asobistage.asobistore.jp${item.ticket_link}`
              : item.ticket_link,
            productId: "asobistage/ics",
          }));
      })
      .flat()
  );
  if (error) {
    console.error(error);
    return new Response("ical generation error", {
      status: 500,
    });
  }

  return new Response(value, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": `max-age=${MAX_AGE}`,
    },
  });
};

serve({
  "/": () => new Response(`asobistage-ics: /calendar.ics (+${SOURCE_URL})`),
  "/calendar.ics": handleRequest,
});
