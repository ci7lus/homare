import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import ics from "https://cdn.skypack.dev/ics";
import { DateTime, datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

const SOURCE_URL = "https://github.com/ci7lus/homare/blob/master/src/mixch.ts";
const MAX_AGE = 60 * 60;

const dateToArr = (d: DateTime) => {
  const date = d.toDateObj();
  return [date.year, date.month, date.day, date.hour, date.minute];
};

export const handleRequest = async () => {
  const response = await fetch("https://mixch.tv/api-web/liveview/list", {
    headers: {
      accept: "*/*",
      "accept-language": "ja,en;q=0.9,en-GB;q=0.8,en-US;q=0.7",
      "cache-control": "no-cache",
      pragma: "no-cache",
      referer: "https://mixch.tv/liveview/list",
      "user-agent": "mixch-ics/1.0",
    },
  });

  if (!response.ok) {
    console.log(await response.text());
    return new Response("fetch error", {
      status: 500,
    });
  }
  const json: {
    liveviews: {
      id: number;
      name: string;
      description: string;
      liveOpenUnixTime: number;
      liveCloseUnixTime: number;
    }[];
  } = await response.json();

  const { error, value } = ics.createEvents(
    json.liveviews.map((live) => {
      const url = `https://mixch.tv/liveview/${live.id}/detail`;
      const startAt = datetime(live.liveOpenUnixTime * 1000, {
        timezone: "UTC",
      });

      return {
        uid: live.id.toString(),
        start: dateToArr(startAt.toUTC()),
        duration: { hours: 1 },
        title: live.name,
        url,
        description: `${url}\n${live.description}`,
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
