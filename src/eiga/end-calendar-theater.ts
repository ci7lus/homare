import { datetime } from "https://deno.land/x/ptera@v1.0.0-beta/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.19-alpha/deno-dom-wasm.ts";

const USER_AGENT =
  "eiga-deno-deploy/end-calendar-theater (+https://eiga.deno.dev)";

type NonUndefined<U> = U extends undefined ? never : U;

// 指定された映画館の上映が終わりそうな映画を取得する
export const getEndCalendarTheater = async (theaterId: string) => {
  const theaterHtml = await fetch(`https://moviewalker.jp/th${theaterId}/`);
  const theaterDom = new DOMParser().parseFromString(
    await theaterHtml.text(),
    "text/html",
  );
  if (!theaterDom) {
    throw new Error();
  }
  const theaterName =
    theaterDom.getElementsByClassName("el_lv1Heading")?.[0].textContent;

  const now = datetime().toZonedTime("Asia/Tokyo");
  const day = now.format("YYYY-MM-dd");

  const theaterJson = await fetch(
    `https://moviewalker.jp/api/schedule/${theaterId}?screeningDate=${day}`,
    { headers: { "user-agent": USER_AGENT } },
  );
  const schedule: { screenings: Movie[] } = await theaterJson.json();
  const nearEndMovies = schedule.screenings
    .map(
      (movie) =>
        movie.screenings
          ?.map((screening) => {
            const matched = screening.remarks
              ?.map((s) => s?.text.match(/\d{1,2}\/\d{1,2}/g)?.[0])
              .shift()
              ?.split("/")
              .map((s) => s.padStart(2, "0"));
            if (!matched) {
              return;
            }
            const [month, day] = matched;
            const year = now.month === 11 && month === "01"
              ? now.year + 1
              : now.year;
            const date = datetime(`${year}/${month}/${day}`).toZonedTime(
              "Asia/Tokyo",
            );
            return {
              date,
              title: movie.title,
              url: screening?.showtime?.[0].reservedUrl,
            };
          })
          .filter((m): m is NonUndefined<typeof m> => !!m) || [],
    )
    .flat();
  return { theaterName, nearEndMovies };
};

export interface Movie {
  screeningId?: number[] | null;
  id: number;
  title: string;
  featureTitle: string;
  image: string;
  releaseDate: string;
  runningTime: string;
  rating: Rating;
  userVotePoint: string;
  numberOfUserWishes: number;
  mvtkUrl?: null;
  mvtkKind?: null;
  screenings?: ScreeningsEntity[] | null;
}
export interface Rating {
  text?: null;
  color?: null;
  border?: null;
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
