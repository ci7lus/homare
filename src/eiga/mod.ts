import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import ics from "https://cdn.skypack.dev/ics@2.31.0";
import { EndCalendarTheater, EndScreeningPredict, Index } from "./docs.tsx";
import { endScreeningPredict } from "./end-screening-predict.ts";
import { encode } from "https://deno.land/std@0.116.0/encoding/base64url.ts";
import {
  DateTime,
  datetime,
} from "https://deno.land/x/ptera@v1.0.0-beta/mod.ts";
import { getEndCalendarTheater } from "./end-calendar-theater.ts";

// deno-lint-ignore no-explicit-any
const handleRequestEndScreeningPredict = async (_: Request, params: any) => {
  const { movieId, areaId } = params;
  if (typeof movieId !== "string" || typeof areaId !== "string") {
    return new Response("err", {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  const predict = await endScreeningPredict(
    parseInt(movieId).toString(),
    parseInt(areaId).toString()
  );
  const calName = `「${predict?.name || movieId}」の「${
    predict?.areaName || areaId
  }」での上映終了予測日`;
  const { value, error } = ics.createEvents(
    [predict]
      .filter((s): s is typeof s & { predicted: DateTime } => "predicted" in s)
      .map(({ predicted, areaName, url, name }) => ({
        uid: encode(areaName).slice(0, 32) + encode(name).slice(0, 32),
        start: [predicted.year, predicted.month, predicted.day],
        duration: { days: 1 },
        title: `「${name}」の「${areaName}」での上映終了予測日`,
        url,
        productId: "eiga-deno-dev/end-screening-predict",
        calName,
      }))
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
      "cache-control": `max-age=3600`,
    },
  });
};

// deno-lint-ignore no-explicit-any
const handleRequestEndCalendarTheater = async (_: Request, params: any) => {
  const { theaterId } = params;
  if (typeof theaterId !== "string") {
    return new Response("err", {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  const schedule = await getEndCalendarTheater(parseInt(theaterId).toString());
  const calName = `${schedule.theaterName}の上映終了カレンダー`;
  const { value, error } = ics.createEvents(
    [
      ...schedule.nearEndMovies,
      {
        title: `${schedule.theaterName}の上映終了カレンダー`,
        date: datetime().add({ year: 1 }),
        url: null,
      },
    ].map(({ title, date, url }) => ({
      uid:
        encode(schedule.theaterName).slice(0, 32) + encode(title).slice(0, 32),
      start: [date.year, date.month, date.day],
      duration: { days: 1 },
      title: `「${title}」の上映終了日`,
      url,
      productId: "eiga-deno-dev/end-calendar-theater",
      location: schedule.theaterName,
      calName,
    }))
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
      "cache-control": `max-age=3600`,
    },
  });
};

serve({
  "/": () => jsx(Index()),
  "/end-screening-predict": () => jsx(EndScreeningPredict()),
  "/end-screening-predict/:movieId/:areaId.ics":
    handleRequestEndScreeningPredict,
  "/end-calendar-theater": () => jsx(EndCalendarTheater()),
  "/end-calendar-theater/:theaterId.ics": handleRequestEndCalendarTheater,
});
