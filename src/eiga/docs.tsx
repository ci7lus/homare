/** @jsx h */
import { h } from "https://deno.land/x/sift@0.4.2/mod.ts";

const Wrapper = ({
  title,
  children,
}: {
  title: string;
  children: h.JSX.Element;
}) => (
  <html>
    <head>
      <title>{title}</title>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css"
      >
      </link>
      <style
        dangerouslySetInnerHTML={{
          __html: `body {
          line-height: 2;
        }`,
        }}
      >
      </style>
    </head>
    {children}
  </html>
);

export const Index = () => (
  <Wrapper title="eiga.deno.dev">
    <body>
      <h1>eiga.deno.dev</h1>
      <p>映画関連のちょっとした自動化ツールを提供してみる実験です。</p>
      <h2>ツール一覧</h2>
      <ul>
        <li>
          <a href="/end-screening-predict">上映終了日予測カレンダー</a>
        </li>
        <li>
          <a href="/end-calendar-theater">映画館別上映終了日カレンダー</a>
        </li>
      </ul>
      <h2>ソースコード</h2>
      <a href="https://github.com/ci7lus/homare/blob/master/src/eiga">
        github.com/ci7lus/homare/eiga
      </a>
    </body>
  </Wrapper>
);

export const EndScreeningPredict = () => (
  <Wrapper title="上映終了日予測カレンダー | eiga.deno.dev">
    <body>
      <h1>上映終了日予測カレンダー</h1>
      <p>
        <a href="https://moviewalker.jp/">MOVIE WALKER PRESS</a>
        から映画の上映情報を取得し、上映終了日を予測するカレンダーです。誤った情報が返される、または上映終了日がうまく返されない可能性があるので、あくまで参考程度に利用してください。
      </p>
      <p>
        <b>追記</b>：
        <a href="/end-calendar-theater">映画館別上映終了日カレンダー</a>
        のほうが正確なので、最寄りが知れればいい場合はそちらを用いてください
      </p>
      <h2>使い方</h2>
      <div>
        <p>
          <a href="https://moviewalker.jp/">MOVIE WALKER PRESS</a>
          で該当の映画IDと、エリアIDを取得してください。
          <br />
          「上映館を探す」でのエリアのURLが
          <code>https://moviewalker.jp/mv72218/schedule/P_toyama/</code>の場合、
          <code>72218</code>が映画ID、
          <code>toyama</code>がエリアIDです。
          <br />
          この場合、icsのURLは
          <code>
            https://eiga.ci7lus.repl.co/end-screening-predict/72218/toyama.ics
          </code>
          です。Googleカレンダーなどに登録して利用してください。
        </p>
      </div>
      <h2>データ取得元</h2>
      <a href="https://moviewalker.jp/">https://moviewalker.jp/</a>
      <hr />
      <a href="/">トップに戻る</a>
    </body>
  </Wrapper>
);

export const EndCalendarTheater = () => (
  <Wrapper title="映画館別上映終了日カレンダー | eiga.deno.dev">
    <body>
      <h1>映画館別上映終了日カレンダー</h1>
      <p>
        <a href="https://moviewalker.jp/">MOVIE WALKER PRESS</a>
        から映画館の上映情報を取得し、上映終了日のカレンダーを返します。誤った情報が返される、または上映終了日がうまく返されない可能性があるので、あくまで参考程度に利用してください。
      </p>
      <h2>使い方</h2>
      <div>
        <p>
          <a href="https://moviewalker.jp/">MOVIE WALKER PRESS</a>
          で該当の映画館IDを取得してください。
          <br />
          映画館のURLが
          <code>https://moviewalker.jp/th416/</code>の場合、
          <code>416</code>が映画館IDです。
          <br />
          この場合、icsのURLは
          <code>https://eiga.deno.dev/end-calendar-theater/416.ics</code>
          です。Googleカレンダーなどに登録して利用してください。
        </p>
      </div>
      <h2>データ取得元</h2>
      <a href="https://moviewalker.jp/">https://moviewalker.jp/</a>
      <hr />
      <a href="/">トップに戻る</a>
    </body>
  </Wrapper>
);
