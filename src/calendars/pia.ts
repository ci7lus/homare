import ics from "https://cdn.skypack.dev/ics@v2.35.0";
import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";
import { dateToArr } from "./dateutils.ts";

const _ = "https://github.com/ci7lus/homare/blob/master/src/mixch.ts";
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

  const { error, value } = ics.createEvents(
    json.results.map((live) => {
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
      const startAt = datetime(date, {
        timezone: "Asia/Tokyo",
      });

      return {
        uid: live.bndlCd,
        start: dateToArr(startAt.toUTC()),
        duration: { hours: 1 },
        title: live.bndlTtlNm,
        url,
        description: `${url}\n${live.bndlShortCatch || ""}\n${live.lgenreCd}`,
        productId: "pia/ics",
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
