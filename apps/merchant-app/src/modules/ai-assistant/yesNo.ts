// Understands a spoken "yes" or "no" in English, Malay or Chinese (for confirming a proposed change by voice).
// Returns null when the words are neither, so they are treated as a new question instead.
// (Chinese has no spaces between words, so it is matched without the \b word-boundary check.)
const NO = /^((no|nope|nah|cancel|stop|don'?t|do not|never mind|tak|tidak|jangan|batal)\b|不|别|取消|算了)/;
const YES = /^((yes|yeah|yep|yup|ok|okay|sure|confirm|do it|go ahead|please do|ya|iya|boleh|betul|setuju|teruskan)\b|好|是|对|可以|确认|行)/;

export function yesOrNo(text: string): boolean | null {
  const s = text.toLowerCase().replace(/[.,!?。，！？]/g, " ").trim();
  if (NO.test(s)) return false; // check "no" first, so "no, don't" never counts as yes
  if (YES.test(s)) return true;
  return null;
}
