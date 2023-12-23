import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
const SOURCE_URL =
  "https://github.com/ci7lus/homare/blob/master/src/mieruko.ts";

serve({
  "/": async (request) => {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    if (request.method !== "GET") {
      return new Response("method not allowed", {
        status: 405,
      });
    }
    const url = new URL(request.url);
    const targetUrl = url.searchParams
      .get("url")
      ?.replace("//twitter.com", "//vxtwitter.com");
    if (!targetUrl) {
      return new Response(`mieruko (+${SOURCE_URL})`);
    }
    const rica = await fetch(
      `https://ricapitolare.vercel.app/?url=${encodeURI(targetUrl)}`
    );
    if (!rica.ok) {
      return new Response("ricapitolare error", {
        status: rica.status,
      });
    }
    const metadata = await rica.json();
    const images: string[] = [metadata.image].filter((s) => s);
    const alterenate = await fetch(metadata.url, {
      headers: {
        accept: "application/activity+json",
        "user-agent": "mieruko/1.0",
      },
    });
    if (
      alterenate.ok &&
      alterenate.headers.get("content-type")?.includes("json")
    ) {
      const activity = await alterenate.json();
      for (const attachment of activity.attachment) {
        images.push(attachment.url);
      }
    }

    return new Response(JSON.stringify({ ...metadata, images }), {
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
});
