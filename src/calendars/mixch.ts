import ical from "npm:ical-generator@7.0.0";
import { getVtimezoneComponent } from "npm:@touch4it/ical-timezones@1.9.0";
import dayjs from "npm:dayjs@1.11.10";
import timezone from "npm:dayjs@1.11.10/plugin/timezone.js";
import utc from "npm:dayjs@1.11.10/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const MAX_AGE = 60 * 60;

export const handleMixch = async () => {
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

  const calendar = ical({ name: "Mixch" });
  calendar.timezone({
    name: "Asia/Tokyo",
    generator: getVtimezoneComponent,
  });

  for (const live of json.liveviews) {
    const url = `https://mixch.tv/liveview/${live.id}/detail`;
    const startAt = dayjs.unix(live.liveOpenUnixTime).tz("Asia/Tokyo");
    const endAt = live.liveCloseUnixTime
      ? dayjs.unix(live.liveCloseUnixTime).tz("Asia/Tokyo")
      : startAt.add(1, "hour");

    calendar.createEvent({
      id: live.id.toString(),
      start: startAt,
      end: endAt,
      summary: live.name,
      url,
      description: `${url}\n${live.description}`,
      timezone: "Asia/Tokyo",
    });
  }

  return new Response(calendar.toString(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": `max-age=${MAX_AGE}`,
    },
  });
};
