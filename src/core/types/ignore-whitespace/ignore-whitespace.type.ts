type Whitespace = " ";

export type IgnoreWhitespace<T extends string, Acc extends string = ""> = (
  T extends `${infer Char}${infer Rest}`
  ? (
    Char extends Whitespace
    ? IgnoreWhitespace<Rest, Acc>
    : IgnoreWhitespace<Rest, `${Acc}${Char}`>
  )
  : (
    T extends ""
    ? Acc
    : (
      T extends string
      ? string
      : never
    )
  )
);
