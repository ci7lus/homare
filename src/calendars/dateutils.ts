import { DateTime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

export const dateToArr = (d: DateTime) => {
  const date = d.toDateObj();
  return [date.year, date.month, date.day, date.hour, date.minute] as [
    number,
    number,
    number,
    number,
    number
  ];
};
