import { feedConfig, getFeedState } from "@/lib/feed";
import type { Lang } from "@/lib/i18n";
import { getMember } from "@/lib/member-auth";
import { visitorHash } from "@/lib/visitor";
import { getUi } from "@/lib/queries";
import FeedActions from "./FeedActions";
import { feedLabels } from "./labels";

/**
 * Likes and comments under an order on its own page: no card, a hairline above and a heading, the buttons together
 * at the start. The order itself stays a pre-built page; only this part is made per visitor, inside a Suspense boundary.
 */
export default async function OrderFeedActions({ lang, id }: { lang: Lang; id: number }) {
  const [ui, cfg, member] = await Promise.all([getUi(lang), feedConfig(), getMember()]);
  const state = (await getFeedState([{ target: "order", id }], member?.id ?? null, member ? null : await visitorHash()))[`order:${id}`];
  return (
    <section aria-labelledby={`order-${id}-comments`} className="mt-2 border-t border-line pt-5">
      <h2 id={`order-${id}-comments`} className="mb-1.5 text-xl font-semibold">
        {ui.fdComments}
      </h2>
      <FeedActions
        spread={false}
        lang={lang}
        target="order"
        id={id}
        likes={state?.likes ?? 0}
        comments={state?.comments ?? 0}
        liked={state?.liked ?? false}
        me={member?.id ?? null}
        labels={feedLabels(ui)}
        commentMax={cfg.commentMax}
        loginHref={`/${lang}/member/login`}
        startOpen
        canLike={cfg.guestLikes}
      />
    </section>
  );
}
