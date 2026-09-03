import { handleBandaiChannel } from "./calendars/bc.ts";
import { handleMixch } from "./calendars/mixch.ts";
import { handlePia } from "./calendars/pia.ts";
import { handleStreamingPlus } from "./calendars/eplus.ts";

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/calendars_mod.ts";

const routes: Record<
  string,
  (req: Request) => Response | Promise<Response>
> = {
  "/": () => new Response(`homare-calendars (+${SOURCE_URL})`),
  "/bc.ics": handleBandaiChannel,
  "/mixch.ics": handleMixch,
  "/pia.ics": handlePia,
  "/eplus.ics": handleStreamingPlus,
};

export default {
  fetch(req: Request) {
    const url = new URL(req.url);
    const handler = routes[url.pathname];
    if (handler) {
      return handler(req);
    }
    return new Response("not found", { status: 404 });
  },
};

if (import.meta.main) {
  Deno.serve((req) => {
    const url = new URL(req.url);
    const handler = routes[url.pathname];
    if (handler) {
      return handler(req);
    }
    return new Response("not found", { status: 404 });
  });
}
