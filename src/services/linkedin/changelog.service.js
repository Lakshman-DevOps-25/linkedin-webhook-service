import { config } from "../../config/index.js";
import { withBackoff, HttpError } from "../../utils/backoff.js";
import { logger } from "../../config/logger.js";

const CHANGELOG_URL = "https://api.linkedin.com/rest/memberChangeLogs";

/**
 * One page of changelog events for a consenting member.
 * - Versioned API: LinkedIn-Version header is REQUIRED.
 * - Only the last 28 days are retained — extended poller downtime = permanent gap.
 */
export async function fetchChangelogPage({ accessToken, start = 0, count = config.CHANGELOG_PAGE_SIZE }) {
  const q = new URLSearchParams({ q: "memberAndApplication", start: String(start), count: String(count) });

  const call = async () => {
    const res = await fetch(`${CHANGELOG_URL}?${q.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": config.LINKEDIN_API_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (!res.ok) {
      const retryAfter = Number(res.headers.get("retry-after")) * 1000 || null;
      throw new HttpError(res.status, `changelog ${res.status}: ${await res.text()}`, retryAfter);
    }
    return res.json();
  };

  const page = await withBackoff(call, { label: "changelog" });
  const elements = Array.isArray(page.elements) ? page.elements : [];
  const pagingStart = page?.paging?.start;
  const nextStart = pagingStart != null && elements.length > 0 ? pagingStart + elements.length : null;
  logger.debug({ start, got: elements.length, nextStart }, "changelog page");
  return { elements, nextStart };
}
