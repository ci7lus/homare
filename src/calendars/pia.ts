import ics from "https://cdn.skypack.dev/ics";
import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";
import { dateToArr } from "./dateutils.ts";

const _ = "https://github.com/ci7lus/homare/blob/master/src/mixch.ts";
const MAX_AGE = 60 * 60;

export const handlePia = async () => {
  const response = await fetch("https://t.pia.jp/streaming", {
    headers: {
      accept: "text/html",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent": "pia-ics/1.0",
    },
  });

  if (!response.ok) {
    console.log(await response.text());
    return new Response("fetch error", {
      status: 500,
    });
  }
  const html = await response.text();
  const jsonStr = html.split(`var rltdEventInfo = `)?.[1]?.split(`;`)?.[0];

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
  } = JSON.parse(jsonStr);

  const { error, value } = ics.createEvents(
    json.results.map((live) => {
      const url = `http://t.pia.jp/pia/event/event.do?eventBundleCd=${live.bndlCd}`;
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
        description: `${url}\n${live.bndlShortCatch || ""}`,
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
