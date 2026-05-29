// contentFilter.ts — Content moderation helpers.
// Currently a stub. Replace the body of commentPassesContentCheck with a
// real word-list check, an ML API call, or a server-side RPC as needed.

// Returns true if the content is acceptable to post, false if it should be rejected.
export function commentPassesContentCheck(_content: string): boolean {
  // TODO: integrate a profanity filter or external moderation API here.
  // Example: import Filter from 'bad-words'; return !new Filter().isProfane(content)
  return true
}
