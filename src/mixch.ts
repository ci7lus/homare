import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import ics from "https://cdn.skypack.dev/ics";
import { DateTime, datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

const SOURCE_URL = "https://github.com/ci7lus/homare/blob/master/src/mixch.ts";
const MAX_AGE = 60 * 60;

const dateToArr = (d: DateTime) => {
  const date = d.toDateObj();
  return [date.year, date.month, date.day, date.hour, date.minute];
};

const handleRequest = async () => {
  const response = await fetch("https://mixch.tv/api-web/liveview/list");

  if (!response.ok) {
    return new Response("fetch error", {
      status: 500,
    });
  }
  const json: {
    liveviews: {
      id: number;
      name: string;
      liveOpenUnixTime: number;
      liveCloseUnixTime: number;
    }[];
  } = await response.json();

  const { error, value } = ics.createEvents(
    json.liveviews.map((live) => {
      const url = `https://mixch.tv/liveview/${live.id}/detail`;
      const startAt = datetime(live.liveOpenUnixTime * 1000, {
        timezone: "Asia/Tokyo",
      });
      const endAt = datetime(live.liveCloseUnixTime * 1000, {
        timezone: "Asia/Tokyo",
      });

      return {
        uid: live.id.toString(),
        start: dateToArr(startAt.toUTC()),
        end: dateToArr(endAt.toUTC()),
        title: live.name,
        url,
        description: url,
        productId: "mixch/ics",
      };
    })
  );
  if (error) {
    console.error(error);
    return new Response("ical generation error", {
      status: 500,
    });
  }

  return new Response(
    value?.replace("METHOD:PUBLISH", "METHOD:PUBLISH\nTZID:Asia/Tokyo"),
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": `max-age=${MAX_AGE}`,
      },
    }
  );
};

serve({
  "/": () => new Response(`mixch-ics: /calendar.ics (+${SOURCE_URL})`),
  "/calendar.ics": handleRequest,
});
