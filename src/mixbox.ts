// @deno-types="https://cdn.esm.sh/v58/firebase@9.6.0/app/dist/app/index.d.ts"
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
// @deno-types="https://cdn.esm.sh/v58/firebase@9.4.1/firestore/dist/firestore/index.d.ts"
import {
  getDocs,
  collection,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
// @deno-types="https://cdn.jsdelivr.net/npm/ics@2.40.0/index.d.ts"
import ics from "https://cdn.skypack.dev/ics@2.40.0";
import { datetime, DateTime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

const SOURCE_URL = "https://github.com/ci7lus/homare/blob/master/src/mixbox.ts";
const MAX_AGE = 60 * 60 * 12;

const dateToArr = (d: DateTime) => {
  const date = d.toDateObj();
  return [date.year, date.month, date.day, date.hour, date.minute] as [
    number,
    number,
    number,
    number,
    number
  ];
};

const firebaseConfig = JSON.parse(Deno.env.get("MIXBOX_FIREBASE_CONFIG")!);

const handleRequest = async () => {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const docs = await getDocs(collection(db, "playlistSchedules"));
  const schedules = docs.docs
    .map((doc) => doc.data())
    .map((schedule) => {
      const toDated: Date = schedule.date.toDate();
      const dateObj = datetime(toDated, {
        timezone: "Asia/Tokyo",
      });
      const date = [
        dateObj.year,
        dateObj.month,
        // timezone gap
        dateObj.day + (dateObj.hour === 0 ? 0 : 1),
      ];
      return { ...schedule, date, unix: toDated.getTime() } as {
        unix: number;
        date: [number, number, number];
        timeframe: string;
        order: number;
        name: string;
        isSpecial: boolean;
      };
    })
    .filter((schedule) => schedule.isSpecial)
    .sort((a, b) => a.unix - b.unix);
  const { value, error } = ics.createEvents(
    schedules.map((schedule) => {
      const [startHour, startMinute, endHour, endMinute] = schedule.timeframe
        .split(/-|:/)
        .map((n) => parseInt(n));
      const [realStartHour, realStartMinute, realEndHour, realEndMinute] =
        schedule.name
          .split(/\(|:|～/)
          .map((n) => parseInt(n))
          .filter((n) => !isNaN(n));
      const start = [
        ...schedule.date,
        realStartHour || startHour,
        realStartMinute || startMinute,
      ];
      const end = [
        ...schedule.date,
        realEndHour || endHour,
        realEndMinute || endMinute,
      ];
      if (18 < start[3] && end[3] < 6) {
        end[2] += 1;
      } else if (end[3] === 24) {
        end[2] += 1;
        end[3] = 0;
        end[4] = 0;
      }
      const startDT = datetime(start, { timezone: "Asia/Tokyo" }).toZonedTime(
        "UTC"
      );
      const endDT = datetime(end, { timezone: "Asia/Tokyo" }).toZonedTime(
        "UTC"
      );
      return {
        uid: schedule.unix.toString(),
        start: dateToArr(startDT),
        startInputType: "utc",
        startOutputType: "utc",
        end: dateToArr(endDT),
        endInputType: "utc",
        endOutputType: "utc",
        title: schedule.name,
        url: "https://mixbox.live/",
        productId: "mixbox/ics",
      };
    })
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
      "cache-control": `public, max-age=${MAX_AGE}`,
    },
  });
};

serve({
  "/": () => new Response(`mixbox-ics: /calendar.ics (+${SOURCE_URL})`),
  "/calendar.ics": handleRequest,
});
