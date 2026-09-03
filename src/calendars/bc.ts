import ical from "npm:ical-generator@7.0.0";
import { getVtimezoneComponent } from "npm:@touch4it/ical-timezones@1.9.0";
import dayjs from "npm:dayjs@1.11.10";
import timezone from "npm:dayjs@1.11.10/plugin/timezone.js";
import utc from "npm:dayjs@1.11.10/plugin/utc.js";
import customParseFormat from "npm:dayjs@1.11.10/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

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

  const calendar = ical({ name: "Bandai Channel" });
  calendar.timezone({
    name: "Asia/Tokyo",
    generator: getVtimezoneComponent,
  });

  for (const schedule of schedules) {
    const startAt = dayjs.tz(
      schedule.program_begin_date,
      "YYYY/MM/DD HH:mm:ss",
      "Asia/Tokyo"
    );
    const endAt = dayjs.tz(
      schedule.program_end_date,
      "YYYY/MM/DD HH:mm:ss",
      "Asia/Tokyo"
    );
    const url = `https://live.b-ch.com/${schedule.alias}`;

    calendar.createEvent({
      id: schedule.alias,
      start: startAt.toDate(),
      end: endAt.toDate(),
      summary: schedule.program_title,
      url,
      description: url,
      timezone: "Asia/Tokyo",
    });
  }

  return new Response(calendar.toString(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": `public, max-age=${MAX_AGE}`,
    },
  });
};
