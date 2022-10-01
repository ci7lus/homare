import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";
// @deno-types="https://cdn.jsdelivr.net/npm/ics@2.40.0/index.d.ts"
import ics from "https://cdn.skypack.dev/ics@2.40.0";
import { dateToArr } from "./dateutils.ts";

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/calendars/bc.ts";
const MAX_AGE = 60 * 60;

export const handleBandaiChannel = async () => {
  const response = await fetch(
    "https://dka82p2ao6.execute-api.ap-northeast-1.amazonaws.com/alpha/schedule",
    {
      headers: {
        "user-agent": `bc (+${SOURCE_URL})`,
      },
    }
  );

  if (!response.ok) {
    return new Response("fetch error", {
      status: 500,
    });
  }

  const schedules: {
    alias: string;
    program_begin_date: string;
    program_end_date: string;
    program_title: string;
  }[] = await response.json();

  const { value, error } = ics.createEvents(
    schedules.map((schedule) => {
      const startAt = datetime(schedule.program_begin_date, {
        timezone: "Asia/Tokyo",
      }).toZonedTime("UTC");
      const endAt = datetime(schedule.program_end_date, {
        timezone: "Asia/Tokyo",
      }).toZonedTime("UTC");
      const url = `https://live.b-ch.com/${schedule.alias}`;
      return {
        uid: schedule.alias,
        start: dateToArr(startAt),
        startInputType: "utc",
        startOutputType: "utc",
        end: dateToArr(endAt),
        endInputType: "utc",
        endOutputType: "utc",
        title: schedule.program_title,
        url,
        description: url,
        productId: "homare/calendars/bc",
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
      "cache-control": `public, max-age=${MAX_AGE}`,
    },
  });
};
