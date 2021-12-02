import { jsx, serve } from "https://deno.land/x/sift@0.3.6/mod.ts";
import ics from "https://cdn.skypack.dev/ics@2.31.0";
import { EndScreeningPredict, Index } from "./docs.tsx";
import { endScreeningPredict } from "./end-screening-predict.ts";
import { encode } from "https://deno.land/std@0.116.0/encoding/base64.ts";
import { DateTime } from "https://deno.land/x/ptera@v1.0.0-beta/mod.ts";

// deno-lint-ignore no-explicit-any
const handleRequest = async (_: Request, params: any) => {
  const { movieId, areaId } = params;
  if (typeof movieId !== "string" || typeof areaId !== "string") {
    return new Response("err", {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  const predict = await endScreeningPredict(movieId, areaId);
  const { value, error } = ics.createEvents(
    [predict]
      .filter((s): s is typeof s & { predicted: DateTime } => "predicted" in s)
      .map(({ predicted, areaName, url, name }) => ({
        uid: encode(`${areaName}${name}`),
        start: [predicted.year, predicted.month, predicted.day],
        duration: { days: 1 },
        title: `「${name}」の「${areaName}」での上映終了予測日`,
        url,
        productId: "eiga-deno-dev/end-screening-predict",
      })),
  );
  if (error) {
    console.error(error);
    return new Response("ical generation error", {
      status: 500,
    });
  }

  return new Response(
    `X-WR-CALNAME:「${predict?.name || movieId}」の「${
      predict?.areaName || areaId
    }」での上映終了予測日\n${value || ""}`,
    {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "cache-control": `max-age=3600`,
      },
    },
  );
};

serve({
  "/": () => jsx(Index()),
  "/end-screening-predict": () => jsx(EndScreeningPredict()),
  "/end-screening-predict/:movieId/:areaId.ics": handleRequest,
});
