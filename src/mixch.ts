import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { handleMixch } from "./calendars/mixch.ts";

const SOURCE_URL = "https://github.com/ci7lus/homare/blob/master/src/mixch.ts";

serve({
  "/": () => new Response(`mixch-ics: /calendar.ics (+${SOURCE_URL})`),
  "/calendar.ics": handleMixch,
});
