/**
 * Line-break helpers for copy (pure; tested in tests/typography.test.ts).
 *
 * withoutWidow keeps a line from ending on a lone word: the last two words
 * are joined with a no-break space, and short connecting words in front of
 * them come along ("days in a row." moves as one, never "in a / row.").
 * The joined tail stays short (MAX_TAIL characters) so it can always wrap.
 */
const NBSP = " ";
const MAX_TAIL = 24;
/** Words this short ("a", "in", "to", "of") travel with the words after them. */
const SHORT_WORD = 2;

export function withoutWidow(text: string): string {
  const words = text.split(" ");
  if (words.length < 3) return words.length === 2 && text.length <= MAX_TAIL ? words.join(NBSP) : text;
  let start = words.length - 2;
  const tailLength = (from: number) => words.slice(from).join(" ").length;
  if (tailLength(start) > MAX_TAIL) return text;
  // Pull short words ("in", "a") into the tail, plus the word they belong to.
  while (start > 1 && words[start].length <= SHORT_WORD && tailLength(start - 1) <= MAX_TAIL) start -= 1;
  return `${words.slice(0, start).join(" ")} ${words.slice(start).join(NBSP)}`;
}
