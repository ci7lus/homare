import ical from "npm:ical-generator@7.0.0";
import { getVtimezoneComponent } from "npm:@touch4it/ical-timezones@1.9.0";
import dayjs from "npm:dayjs@1.11.10";
import timezone from "npm:dayjs@1.11.10/plugin/timezone.js";
import utc from "npm:dayjs@1.11.10/plugin/utc.js";
import customParseFormat from "npm:dayjs@1.11.10/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const MAX_AGE = 60 * 60;

export const handlePia = async () => {
  const response = await fetch(
    `https://t.pia.jp/pia/event/ajax/getRelatedEventInfo?tagCd=0000094&tgtStartDate=&tgtEndDate=&lgenreCd=&sgenreCd=&tagExType=2&_=${new Date().getTime()}`,
    {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": "pia-ics/1.0",
        Referer: "https://t.pia.jp/streaming",
      },
    }
  );

  if (!response.ok) {
    console.log(await response.text());
    return new Response("fetch error", {
      status: 500,
    });
  }

  const json: {
    results: {
      bndlCd: "b2347656";
      bndlShortCatch: string | null;
      bndlTtlNm: "【動画配信】ラブライブ！虹ヶ咲学園スクールアイドル同好会 6th Live！ I love You You love Me〈愛知公演〉";
      bundleFlg: "1";
      eventRank: null;
      imageAlt: "ラブライブ！虹ヶ咲学園スクールアイドル同好会 6th Live！";
      imageCmnt: "(C)2022 プロジェクトラブライブ！虹ヶ咲学園スクールアイドル同好会";
      imageUrl: "202312/202312080047_b.jpg";
      lgenreCd: "01";
      perfEdda: "2023/12/31(日)";
      perfStTime: null;
      perfStda: "2023/12/23(土)";
      prefectureInfoList: [];
      recommendFlg: "0";
      zaikoFlg: "0";
      perfStdaFormatted: "12/23(土)";
    }[];
  } = await response.json();

  const calendar = ical({ name: "PIA" });
  calendar.timezone({
    name: "Asia/Tokyo",
    generator: getVtimezoneComponent,
  });

  for (const live of json.results) {
    const url =
      live.bundleFlg == "1"
        ? `http://t.pia.jp/pia/event/event.do?eventBundleCd=${live.bndlCd}`
        : `https://t.pia.jp/pia/event/event.do?eventCd=${live.bndlCd}`;
    const prefix = live.perfStda
      .split("(")?.[0]
      ?.split("/")
      .map((s) => (s.length === 1 ? `0${s}` : s))
      .join("-");
    const suffix = live.perfStdaFormatted.split(" ")?.[1];
    const date = `${prefix || ""} ${suffix || "00:00"}`.trim();
    const startAt = dayjs.tz(date, "YYYY-MM-DD HH:mm", "Asia/Tokyo");
    const endAt = startAt.add(1, "hour");

    calendar.createEvent({
      id: live.bndlCd,
      start: startAt.toDate(),
      end: endAt.toDate(),
      summary: live.bndlTtlNm,
      url,
      description: `${url}\n${live.bndlShortCatch || ""}\n${live.lgenreCd}`,
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
