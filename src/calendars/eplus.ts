import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";
import ical from "npm:ical-generator@7.0.0";
import { getVtimezoneComponent } from "npm:@touch4it/ical-timezones@1.9.0";
import { unescapeHtml } from "https://deno.land/x/escape@1.4.2/mod.ts";

const MAX_AGE = 60 * 60;
const API_TOKEN = "FGXySj3mTd";

export const handleStreamingPlus = async () => {
  const now = datetime();
  const startFrom = now.format("YYYYMMdd");
  const startTo = now.add({ day: 8 }).format("YYYYMMdd");
  const response = await fetch(
    `https://api.eplus.jp/v3/koen?streaming_haishin_kubun_list=1&child_koen_jogai_flag=1&koenbi_start_from=${startFrom}&koenbi_start_to=${startTo}&kanren_tour_shutoku_flag=1&sort_key=koenbi%2Ckaien_time%2Ckogyo_code%2Ckogyo_sub_code&shutoku_start_ichi=1&shutoku_kensu=100`,
    {
      headers: {
        "user-agent": `eplus-streamingplus-schedule-ics/1.0`,
        "X-Apitoken": API_TOKEN,
      },
    }
  );

  if (!response.ok) {
    console.log("fetch error", await response.text());
    return new Response("fetch error", {
      status: 500,
    });
  }

  const json: {
    data: {
      record_list: {
        koenbi_hyoji_mongon?: string;
        haishin_yotei_time?: string;
        kanren_venue?: { venue_name?: string };
        kanren_kogyo_sub?: {
          kogyo_name_1?: string;
          kogyo_name_2?: string;
        };
        koen_detail_url_pc?: string;
      }[];
    };
  } = await response.json();

  const calendar = ical({ name: "Streaming+" });
  calendar.timezone({
    name: "Asia/Tokyo",
    generator: getVtimezoneComponent,
  });
  json.data.record_list.forEach((event) => {
    if (!event.koenbi_hyoji_mongon) {
      return;
    }
    // 2024/4/14(日)12:30
    const match = event.koenbi_hyoji_mongon.match(
      /(\d{4})\/(\d{1,2})\/(\d{1,2})\(.+\)(\d{1,2}):(\d{2})/
    );

    if (!match) {
      return;
    }
    const [, year, month, day, hour, minute] = match;
    const startAt = datetime({
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
    });
    calendar.createEvent({
      id: event.koen_detail_url_pc,
      start: startAt.toJSDate(),
      end: startAt.add({ hour: 1 }).toJSDate(),
      summary: unescapeHtml(
        [
          event.kanren_kogyo_sub?.kogyo_name_1,
          event.kanren_kogyo_sub?.kogyo_name_2,
        ]
          .filter((s) => !!s)
          .join(" ")
      ),
      description: unescapeHtml(event.koen_detail_url_pc ?? ""),
      timezone: "Asia/Tokyo",
    });
  });

  return new Response(calendar.toString(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": `public, max-age=${MAX_AGE}`,
    },
  });
};

if (import.meta.main) {
  const response = await handleStreamingPlus();
  console.log(await response.text());
}
