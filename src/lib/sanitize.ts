/**
 * Removes anything that looks like a credential from a message before it is
 * shown on a screen or written to a log.
 */

const URL_CREDENTIALS = /(\w+:\/\/)[^:@/\s]+:[^@/\s]*@/g;
const URL_CREDENTIALS_ANY = /(\w+:\/\/)[^@/\s]*@/g;
const QUERY_SECRET =
  /([?&](?:password|passwd|pwd|secret|token|api[_-]?key|authorization)=)[^&\s]*/gi;
const NAMED_SECRET =
  /\b((?:password|passwd|pwd|secret|token|api[_-]?key|authorization)\s*[=:]\s*)("?)[^\s",}&]+\2/gi;

/** Strip credentials from an error message. */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(URL_CREDENTIALS, "$1***:***@")
    .replace(URL_CREDENTIALS_ANY, "$1***@")
    .replace(QUERY_SECRET, "$1***")
    .replace(NAMED_SECRET, "$1***");
}
