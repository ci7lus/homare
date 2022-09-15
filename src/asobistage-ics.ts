import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import ics from "https://cdn.skypack.dev/ics";
import { DateTime, datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/asobistage-ics.ts";
const MAX_AGE = 60 * 60;

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
        });
        const created = datetime(item.createdAt, {
          timezone: "UTC",
        });
        const lastModified = datetime(item.revisedAt, {
          timezone: "UTC",
        });

        const listviewDate = item.listview_date
          .split(/・|〜|～|~|-|\s\/\s|\n/)
          .map((d) => d.trim())
          .filter((s) => !!s);
        const eventDate = item.text_eventdate
          .split(/・|〜|～|~|-|\s\/\s|\n/)
          .map((d) => d.trim())
          .filter((s) => !!s);

        const parseTextDate = (dateStr: string) => {
          const dateIdent = dateStr
            .split(/\.|\s|:|\//)
            .map((n) => parseInt(n.trim()))
            .filter((n) => !Number.isNaN(n));
          let year: number;
          let month: number;
          let day: number;
          let hour: number | null = null;
          let minute: number | null = null;
          if (5 <= dateIdent.length) {
            if (5 < dateIdent.length) {
              console.warn(`Unexpected splitter: ${dateStr}`);
            }
            [year, month, day, hour, minute] = dateIdent;
          } else if (3 <= dateIdent.length) {
            [year, month, day] = dateIdent;
          } else if (2 === dateIdent.length) {
            year = countdown.year;
            if (dateStr.includes(":")) {
              month = countdown.month;
              day = countdown.day;
              [hour, minute] = dateIdent;
            } else {
              [month, day] = dateIdent;
            }
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
          if (hour !== null && minute !== null) {
            target.hour = 0;
            target.minute = 0;
          }
          const dt = datetime(target, { timezone: "Asia/Tokyo" });
          if (hour !== null && minute !== null) {
            dt.add({ hour, minute });
          }
          return dt.toUTC();
        };

        const [, lvEnd] = listviewDate.map(parseTextDate);
        const [evStart, evEnd] = eventDate.map(parseTextDate);
        const createEvent = (datetime: DateTime, idx?: number) => ({
          uid: item.id + "-" + (idx || 0),
          start: dateToArr(datetime),
          created: dateToArr(created),
          lastModified: dateToArr(lastModified),
          duration: { hours: 1 },
          title: `${item.title}${idx !== undefined ? ` (Day ${idx + 1})` : ""}`,
          url: item.ticket_link?.startsWith("/")
            ? `https://asobistage.asobistore.jp${item.ticket_link}`
            : item.ticket_link,
          productId: "asobistage/ics",
        });
        // listviewだと長過ぎる: THE IDOLM@STER MILLION LIVE!7thLIVE Q@MP FLYER!!! Reburn
        // eventdateだと長過ぎる: オンラインドラマシアター「人間椅子」
        if (!lvEnd || !evEnd) {
          return [createEvent(countdown)];
        }
        const diffInDate =
          (evEnd.toMilliseconds() - evStart.toMilliseconds()) /
          1000 /
          60 /
          60 /
          24;
        return [...Array(Math.floor(diffInDate) + 1).keys()]
          .map((add) => [datetime(countdown).add({ day: add }), add] as const)
          .map(([datetime, idx]) => createEvent(datetime, idx));
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
      "content-type": "text/plain; charset=utf-8",
      "cache-control": `max-age=${MAX_AGE}`,
    },
  });
};

serve({
  "/": () => new Response(`asobistage-ics: /calendar.ics (+${SOURCE_URL})`),
  "/calendar.ics": handleRequest,
});
