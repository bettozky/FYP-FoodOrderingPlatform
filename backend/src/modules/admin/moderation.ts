// Simple automatic screening of new reviews. A flagged review stays visible until an admin decides,
// but it goes to the top of the moderation queue. (A real system would use a proper moderation service.)
const RUDE = ["fuck", "shit", "bastard", "bitch", "asshole", "idiot", "stupid", "damn you", "kill you"];

export function screenReview(comment: string | undefined): string | undefined {
  if (!comment) return undefined;
  const t = comment.toLowerCase();
  if (RUDE.some((w) => t.includes(w))) return "Possible abusive language";
  if (/(https?:\/\/|www\.)\S+/.test(t)) return "Contains a link";
  if (/\+?\d[\d\s-]{8,}\d/.test(t)) return "Contains a phone number";
  return undefined;
}
