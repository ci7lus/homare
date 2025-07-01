import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import ics from "https://cdn.skypack.dev/ics@v2.35.0";
import { DateTime, datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";
import ical from "npm:ical-generator@7.0.0";
import { getVtimezoneComponent } from "npm:@touch4it/ical-timezones@1.9.0";
import dayjs from "npm:dayjs@1.11.10";
import customParseFormat from "npm:dayjs@1.11.10/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/asobistage-ics.ts";
const MAX_AGE = 60 * 60;

const dateToArr = (d: DateTime) => {
  const date = d.toDateObj();
  return [date.year, date.month, date.day, date.hour, date.minute];
};

const handleRequest = async () => {
  const [eventReq, eventListReq] = await Promise.all([
    fetch("https://asobistage.asobistore.jp/cdn/v101/commons/event.json"),
    fetch("https://asobistage.asobistore.jp/cdn/v101/commons/event_list.json"),
  ]);

  if (!eventReq.ok || !eventListReq.ok) {
    return new Response("fetch error", {
      status: 500,
    });
  }

  const cdnEvent = (await eventReq.json()) as {
    contents: CdnEventContent[];
  };
  const cdnEventList = (await eventListReq.json()) as {
    events: CdnEventListItem[];
  };

  const calendar = ical({ name: "asobistage" });
  calendar.timezone({
    name: "Asia/Tokyo",
    generator: getVtimezoneComponent,
  });

  cdnEvent.contents.forEach((event) => {
    if (event.release_status !== 1) {
      return;
    }
    const pair = cdnEventList.events.find((e) => e.slug === event.id);
    if (!pair) {
      return;
    }
    const createdAt = dayjs(event.createdAt).toDate();
    const updatedAt = dayjs(event.updatedAt).toDate();
    for (const broadcast of pair.broadcasts) {
      if (broadcast.schedule_release_flag !== 1) {
        continue;
      }
      const date = dayjs(broadcast.performance_date, "YYYY-MM-DD");

      calendar.createEvent({
        id: `${event.id}-${broadcast.broadcast_slug}`,
        start: date.toDate(),
        allDay: true,
        summary: [event.title, broadcast.broadcast_name].join(" "),
        description: `https://asobistage.asobistore.jp/event/${pair.slug}/${broadcast.broadcast_slug}`,
        timezone: "Asia/Tokyo",
        created: createdAt,
        lastModified: updatedAt,
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

const handleTicketRequest = async () => {
  const response = await fetch(
    "https://asobi-ticket.api.app.t-riple.com/api/v1/public/receptions"
  );

  if (!response.ok) {
    console.warn(await response.text());
    return new Response("fetch error", {
      status: 500,
    });
  }

  type RelationshipType = "booth" | "tour" | "image" | "act";

  const json: {
    data: {
      type: "reception";
      id: string;
      attributes: {
        name: string;
        status: string;
        main_body: string;
        entry_period_starts_at: string;
      };
      relationships: {
        tour: {
          data?: {
            id: string;
            type: RelationshipType;
          };
        };
      };
    }[];
    included: {
      id: string;
      type: RelationshipType;
      attributes: {
        slug: string;
        name: string;
        status: "not_public";
      };
    }[];
  } = await response.json();

  const { error, value } = ics.createEvents(
    json.data
      .filter(
        (item) =>
          item.type === "reception" &&
          item.attributes.status === "public" &&
          item.relationships.tour
      )
      .map((item) => {
        const startAt = datetime(item.attributes.entry_period_starts_at, {
          timezone: "JST",
        });
        const tour = json.included.find(
          (i) => i.id === item.relationships.tour.data?.id
        );
        const url = `https://asobiticket2.asobistore.jp/receptions/${item.id}`;
        return {
          uid: `asobiticket/${item.id}`,
          start: dateToArr(startAt),
          duration: { hours: 1 },
          title: `${tour?.attributes.name} ${item.attributes.name}`,
          url,
          description: `${url}\n${item.attributes.main_body}`,
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

type CdnEventContent = {
  content_id: string;
  countdown_archive: string;
  countdown_live: string;
  createdAt: string;
  event_end_date: string;
  event_performance_date: string[];
  event_start_date: string;
  id: string;
  publishedAt: string;
  release_status: number;
  revisedAt: string;
  thumb: { url: string };
  title: string;
  type: string[];
  updatedAt: string;
};
type CdnEventListItem = {
  slug: string;
  event_performance_date: string[];
  broadcasts: CdnEventListBroadcast[];
};
type CdnEventListBroadcast = {
  broadcast_name: string;
  broadcast_slug: string;
  performance_date: string;
  schedule_release_flag: number;
};

serve({
  "/": () =>
    new Response(
      `asobistage-ics: /calendar.ics (+${SOURCE_URL})\nasobichannel-ics: /channel.ics\nasobiticket-ics: /ticket.ics`
    ),
  "/calendar.ics": handleRequest,
  "/channel.ics": handleChannelRequest,
  "/ticket.ics": handleTicketRequest,
});
