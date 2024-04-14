import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { handleBandaiChannel } from "./calendars/bc.ts";
import { handleMixch } from "./calendars/mixch.ts";
import { handlePia } from "./calendars/pia.ts";
import { handleStreamingPlus } from "./calendars/eplus.ts";

const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/calendars_mod.ts";

serve({
  "/": () => new Response(`homare-calendars (+${SOURCE_URL})`),
  "/bc.ics": handleBandaiChannel,
  "/mixch.ics": handleMixch,
  "/pia.ics": handlePia,
  "/eplus.ics": handleStreamingPlus,
});
