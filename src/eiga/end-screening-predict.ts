import {
  DOMParser,
  Element,
  HTMLDocument,
} from "https://deno.land/x/deno_dom@v0.1.19-alpha/deno-dom-wasm.ts";
import { datetime } from "https://deno.land/x/ptera@v1.0.0-beta/mod.ts";

const USER_AGENT =
  "eiga-deno-deploy/end-screening-predict (+https://eiga.deno.dev)";

const querySelectorAll = <T = Element>(
  element: HTMLDocument | Element,
  query: string,
): T[] => {
  // deno-lint-ignore no-explicit-any
  return (element.querySelectorAll(query) as any as T[]) || [];
};

const z = (s: string | number) => s.toString().padStart(2, "0");

const monthAndDateToDT = (month: string, date: string) => {
  const now = datetime().toZonedTime("Asia/Tokyo");
  const year = now.month === 11 && month === "1" ? now.year + 1 : now.year;
  return datetime(`${year}/${z(month)}/${z(date)}`).toZonedTime("Asia/Tokyo");
};

const queryLastDay = (document: HTMLDocument) => {
  const queriedDays = querySelectorAll(
    document.querySelector(".un_theaterSchedule_days")!,
    "li.swiper-slide",
  );
  let lastMonth: string | null = null;
  const days = [];
  for (const li of queriedDays) {
    const month: string | null = li
      .querySelector("span.bl_theaterSchedule_days_month")
      ?.textContent?.replace("/", "") || lastMonth;
    if (month) {
      lastMonth = month;
    }
    const day = li.querySelector(
      "span.bl_theaterSchedule_days_day",
    )?.textContent;
    const isAvailable = !li.classList.contains("bl_disabled");
    days.push({ month, day, isAvailable });
  }
  const lastDay = days.find((day, idx, obj) => {
    const after = obj.slice(0).splice(idx + 1);
    return (
      after.length == 0 ||
      (day.isAvailable && after.every((e) => e.isAvailable === false))
    );
  });
  return lastDay;
};

export const endScreeningPredict = async (movieId: string, area: string) => {
  const now = datetime().toZonedTime("Asia/Tokyo");
  const day = now.format("YYYY-MM-dd");

  const url = `https://moviewalker.jp/mv${movieId}/schedule/P_${area}/`;

  const prefHtml = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  const pref = new DOMParser().parseFromString(
    await prefHtml.text(),
    "text/html",
  );
  if (!pref) {
    throw new Error();
  }
  const name = pref.querySelector("a[href^='/mv'] > span")?.textContent ||
    "取得失敗";
  const areasJson = await fetch(
    `https://moviewalker.jp/api/schedule/${movieId}/${area}?screeningDate=${day}`,
    { headers: { "user-agent": USER_AGENT } },
  );
  const areas: Areas = await areasJson.json();
  const theaters = areas.areas
    .map((area) =>
      area.theaters.map((theater) => ({ ...theater, areaName: area.name }))
    )
    .flat();
  const lastDays = await Promise.all(
    theaters.map(async (theater) => {
      const theaterHtml = await fetch(
        `https://moviewalker.jp/th${theater.id}/schedule/`,
        { headers: { "user-agent": USER_AGENT } },
      );
      const theaterParsed = new DOMParser().parseFromString(
        await theaterHtml.text(),
        "text/html",
      );
      if (!theaterParsed) {
        return;
      }
      const lastDay = queryLastDay(theaterParsed);
      if (!lastDay) {
        return;
      }
      return monthAndDateToDT(lastDay.month!, lastDay.day!);
    }),
  );
  const minTheaterDay = lastDays.reduce((a, b) => (a!.isBefore(b) ? a : b));
  const prefLastDay = queryLastDay(pref);
  if (!prefLastDay) {
    return;
  }
  const prefLastDayDt = monthAndDateToDT(prefLastDay.month!, prefLastDay.day!);
  if (prefLastDayDt.isBefore(minTheaterDay)) {
    return {
      name,
      url,
      predicted: prefLastDayDt,
      areaName: areas.areas.map((area) => area.name).join(", "),
    };
  }
};

export interface Areas {
  areas: AreasEntity[];
}
export interface AreasEntity {
  screeningId: number[];
  name: string;
  theaters: TheatersEntity[];
}
export interface TheatersEntity {
  id: number;
  name: string;
  url: string;
  supportMvtk: boolean;
  screenings?: ScreeningsEntity[] | null;
}
export interface ScreeningsEntity {
  date: string;
  undisplayShowtime?: null;
  showtime?: ShowtimeEntity[] | null;
  remarks?: RemarksEntity[] | null;
}
export interface ShowtimeEntity {
  startTime: string;
  reservedUrl: string;
  reservedStatus: string;
  isReservation: boolean;
}
export interface RemarksEntity {
  text: string;
}
