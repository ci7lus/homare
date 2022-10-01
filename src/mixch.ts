import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import ics from "https://cdn.skypack.dev/ics";
import { DateTime, datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";
import {
  DOMParser,
  Element,
  HTMLDocument,
  initParser,
} from "https://deno.land/x/deno_dom@v0.1.31-alpha/deno-dom-wasm-noinit.ts";

const SOURCE_URL = "https://github.com/ci7lus/homare/blob/master/src/mixch.ts";
const MAX_AGE = 60 * 60;

const dateToArr = (d: DateTime) => {
  const date = d.toDateObj();
  return [date.year, date.month, date.day, date.hour, date.minute];
};

const z = (s: string | number) => s.toString().padStart(2, "0");

const monthAndDateToDT = (
  month: string,
  date: string,
  hour: string,
  minute: string
) => {
  const now = datetime().toZonedTime("Asia/Tokyo");
  const year = now.month === 11 && month === "1" ? now.year + 1 : now.year;
  return datetime(`${year}-${z(month)}-${z(date)}T${z(hour)}:${z(minute)}`, {
    timezone: "Asia/Tokyo",
  });
};

await initParser();

const querySelectorAll = <T = Element>(
  element: HTMLDocument | Element,
  query: string
): T[] => {
  // deno-lint-ignore no-explicit-any
  return (element.querySelectorAll(query) as any as T[]) || [];
};

const handleRequest = async () => {
  const response = await fetch("https://mixch.tv/liveview/list", {
    headers: {
      "user-agent":
        "mixch/13.0.0 (jp.ne.donuts.mixch; build:13.0.0.0; iOS 15.0.0) Alamofire/5.4.0",
    },
  });

  if (!response.ok) {
    return new Response("fetch error", {
      status: 500,
    });
  }

  const list = new DOMParser().parseFromString(
    await response.text(),
    "text/html"
  );
  if (!list) {
    return new Response("parse error", {
      status: 500,
    });
  }

  const lives = Array.from(querySelectorAll<HTMLLIElement>(list, "li.ticket"))
    .map((li) => {
      const href = li.querySelector("a")?.getAttribute("href");
      if (!href) {
        return;
      }
      const title = li.querySelector("p.name")?.textContent;
      const date = li
        .querySelector("div.overview")
        ?.childNodes[3]?.childNodes[4]?.textContent?.trim();
      if (!date) {
        return;
      }
      const [month, monthAfter] = date.split("月");
      const [day] = monthAfter.split("日");
      const startAt = li
        .querySelector("div.overview")
        ?.childNodes[5]?.childNodes[4]?.textContent?.trim()
        ?.replace("START", "")
        .replace("〜", "");
      if (!startAt) {
        return;
      }
      const [hour, minute] = startAt.split(":");
      const dt = monthAndDateToDT(month, day, hour, minute);
      const price = li
        .querySelector("div.overview")
        ?.childNodes[7]?.childNodes[4]?.textContent?.trim()
        .replace("〜", "");
      return { href, title, startAt: dt, price };
    })
    .filter((s): s is Exclude<typeof s, undefined> => !!s);

  const { error, value } = ics.createEvents(
    lives.map((item) => {
      const url = `https://mixch.tv${item.href}`;
      return {
        uid: item.href,
        start: dateToArr(item.startAt.toUTC()),
        duration: { hours: 1 },
        title: item.title,
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
    value.replace("METHOD:PUBLISH", "METHOD:PUBLISH\nTZID:Asia/Tokyo"),
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
