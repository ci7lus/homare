import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import ics from "https://cdn.skypack.dev/ics@v2.35.0";
import { DateTime, datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";
import ical from "npm:ical-generator@7.0.0";
import { getVtimezoneComponent } from "npm:@touch4it/ical-timezones@1.9.0";
import dayjs from "npm:dayjs@1.11.10";

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/asobistage-ics.ts";
const MAX_AGE = 60 * 60;

const dateToArr = (d: DateTime) => {
  const date = d.toDateObj();
  return [date.year, date.month, date.day, date.hour, date.minute];
};

const handleRequest = async () => {
  const [cdnEventsReq, microEventsReq] = await Promise.all([
    fetch("https://asobistage.asobistore.jp/cdn/v101/commons/event_list.json"),
    fetch(
      "https://asobistage.microcms.io/api/v1/event?limit=6&filters=pickup%5Bequals%5Dtrue",
      {
        headers: {
          "X-Microcms-Api-Key": "ece26e2c-22ab-4e3b-98ed-d6daca970eeb",
        },
      }
    ),
  ]);

  if (!cdnEventsReq.ok || !microEventsReq.ok) {
    return new Response("fetch error", {
      status: 500,
    });
  }

  const cdnEvents: {
    events: { slug: string; event_performance_date: string[] }[];
  } = await cdnEventsReq.json();
  const microEvents: {
    contents: {
      id: string;
      title: string;
      countdown_live?: string;
      ticket_link: string;
    }[];
  } = await microEventsReq.json();

  const calendar = ical({ name: "Streaming+" });
  calendar.timezone({
    name: "Asia/Tokyo",
    generator: getVtimezoneComponent,
  });

  cdnEvents.events.forEach((cEvent) => {
    const event = microEvents.contents.find((item) => item.id === cEvent.slug);
    if (!event || !event.countdown_live) {
      return;
    }
    const startAt = dayjs(event.countdown_live);
    for (const [dateStr, idx] of cEvent.event_performance_date.map(
      (d, idx) => [d, idx] as const
    )) {
      const date = dayjs(dateStr);
      const startAtInDate = startAt
        .clone()
        .set("year", date.year())
        .set("month", date.month())
        .set("date", date.date());
      calendar.createEvent({
        id: `${event.id}-${idx}`,
        start: startAtInDate.toDate(),
        end: startAtInDate.clone().add(1, "hour").toDate(),
        summary: `${event.title}${
          cEvent.event_performance_date.length >= 2 ? ` ${idx + 1}日目` : ""
        }`,
        description: `https://asobistage.asobistore.jp${event.ticket_link}`,
        timezone: "Asia/Tokyo",
      });
    }
  });

  return new Response(calendar.toString(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": `max-age=${MAX_AGE}`,
    },
  });
};

const handleChannelRequest = async () => {
  const response = await fetch(
    "https://channel.microcms.io/api/v1/media?orders=-period.start&limit=15",
    {
      headers: {
        "X-Microcms-Api-Key": "qRaKehul9AHU8KtL0dnq1OCLKnFec6yrbcz3",
      },
    }
  );

  if (!response.ok) {
    console.warn(await response.text());
    return new Response("fetch error", {
      status: 500,
    });
  }

  const json: {
    contents: {
      body: string;
      id: string;
      period?: { start?: string; end?: string };
      createdAt: string;
      updatedAt: string;
      title: string;
      contents: { video_type: string[] };
    }[];
  } = await response.json();

  const { error, value } = ics.createEvents(
    json.contents
      .filter((item) => item.contents.video_type.includes("LIVE"))
      .map((item) => {
        const startAt = datetime(item.period?.start ?? item.updatedAt, {
          timezone: "UTC",
        });
        const createdAt = datetime(item.createdAt, { timezone: "UTC" });
        const updatedAt = datetime(item.updatedAt, { timezone: "UTC" });
        const url = `https://asobichannel.asobistore.jp/watch/${item.id}`;
        return {
          uid: `asobichannel/${item.id}`,
          start: dateToArr(startAt),
          duration: { hours: 1 },
          created: dateToArr(createdAt),
          lastModified: dateToArr(updatedAt),
          title: `${item.period?.start ? "" : "[放送日付不明]"}${item.title}`,
          url,
          description: `${url}\n${item.body}`,
          productId: "asobichannel/ics",
        };
      })
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
  "/": () =>
    new Response(
      `asobistage-ics: /calendar.ics (+${SOURCE_URL})\nasobichannel-ics: /channel.ics`
    ),
  "/calendar.ics": handleRequest,
  "/channel.ics": handleChannelRequest,
});
