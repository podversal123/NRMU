/**
 * Footer clean-up (October 2026). Safe to run more than once, and it never overwrites text changed in the admin.
 *  - Explore: hides "Raise a grievance" (the footer already has a button for it) and "Divisions" (the footer lists every division).
 *  - Important links: none. Links that take visitors to other websites are switched off (kept in the admin, not deleted).
 *  - Website policy links: adds Disclaimer, Copyright policy, Hyperlinking policy and Help, in the usual Government order,
 *    and renames "Contact us" to "Contact & feedback".
 *  - About text: drops the union's name, which the footer already shows in large type.
 *  - Accessibility page: the latest-orders strip now always moves, so the sentence that said otherwise is corrected.
 * Run after scripts/add-policy-pages.ts:   npx tsx scripts/update-footer-links.ts
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
config({ path: ".env.local" });

// Website policy links, in this order. Links to pages that are still empty stay hidden on the website.
const POLICY_LINKS = [
  { href: "/pages/privacy-policy", en: "Privacy policy", hi: "गोपनीयता नीति" },
  { href: "/pages/terms", en: "Terms of use", hi: "उपयोग की शर्तें" },
  { href: "/pages/disclaimer", en: "Disclaimer", hi: "अस्वीकरण" },
  { href: "/pages/copyright-policy", en: "Copyright policy", hi: "कॉपीराइट नीति" },
  { href: "/pages/hyperlinking-policy", en: "Hyperlinking policy", hi: "हाइपरलिंक नीति" },
  { href: "/pages/accessibility", en: "Accessibility statement", hi: "सुगम्यता वक्तव्य" },
  { href: "/pages/help", en: "Help", hi: "सहायता" },
  { href: "/pages/contact", en: "Contact & feedback", hi: "संपर्क एवं सुझाव" },
  { href: "/sitemap", en: "Sitemap", hi: "साइट मैप" },
];

const ABOUT_OLD_EN = "Northern Railway Men's Union is a trade union of railway employees, affiliated to the All India Railwaymen's Federation (AIRF).";
const ABOUT_NEW_EN = "A trade union of the railway employees of Northern Railway, active since 1952 and affiliated to the All India Railwaymen's Federation (AIRF).";
const ABOUT_OLD_HI = "उत्तर रेलवे मेन्स यूनियन रेलवे कर्मचारियों की ट्रेड यूनियन है, जो अखिल भारतीय रेलवे कर्मचारी महासंघ (AIRF) से संबद्ध है।";
const ABOUT_NEW_HI = "उत्तर रेलवे के रेलकर्मियों की ट्रेड यूनियन, जो 1952 से सक्रिय है और अखिल भारतीय रेलवे कर्मचारी महासंघ (AIRF) से संबद्ध है।";

const TICKER_OLD_EN = " The moving list of latest orders has a pause button and does not move for people who ask their device for less motion.";
const TICKER_NEW_EN = " The moving list of latest orders stops when you point at it and has its own pause button.";
const TICKER_OLD_HI = " ताज़ा आदेशों की चलती सूची में रोकने का बटन है और जो लोग अपने उपकरण से कम गति माँगते हैं उनके लिए वह चलती नहीं।";
const TICKER_NEW_HI = " ताज़ा आदेशों की चलती सूची पर माउस ले जाने से वह रुक जाती है और उसमें रोकने का अलग बटन भी है।";

async function main() {
  const { getDb } = await import("../src/db");
  const db = getDb();
  const count = (r: { rows?: unknown[] }) => (r.rows ?? []).length;

  const hidden = await db.execute(
    sql`update nav_items set active = false where area = 'footer' and href in ('/grievance', '/divisions') and active returning id`,
  );
  console.log(`Explore: ${count(hidden)} duplicate link(s) hidden`);

  const external = await db.execute(sql`update nav_items set active = false where area = 'links' and active returning id`);
  console.log(`Important links: ${count(external)} link(s) to other websites switched off`);

  let added = 0;
  for (const [i, l] of POLICY_LINKS.entries()) {
    const found = await db.execute(sql`update nav_items set sort = ${i} where area = 'policy' and href = ${l.href} returning id`);
    if (count(found)) continue;
    await db.execute(sql`insert into nav_items (area, label_en, label_hi, href, sort, active) values ('policy', ${l.en}, ${l.hi}, ${l.href}, ${i}, true)`);
    added++;
  }
  console.log(`Policy links: ${added} added, order set`);
  const renamed = await db.execute(
    sql`update nav_items set label_en = 'Contact & feedback', label_hi = 'संपर्क एवं सुझाव' where area = 'policy' and href = '/pages/contact' and label_en = 'Contact us' returning id`,
  );
  console.log(`Contact link: ${count(renamed) ? "renamed" : "already renamed or changed in the admin"}`);

  const about = await db.execute(
    sql`update site_settings set value_en = ${ABOUT_NEW_EN}, value_hi = ${ABOUT_NEW_HI} where key = 'footer.about' and value_en = ${ABOUT_OLD_EN} and value_hi = ${ABOUT_OLD_HI} returning key`,
  );
  console.log(`About text: ${count(about) ? "shortened" : "already changed, left as it is"}`);

  const a11y = await db.execute(
    sql`update pages set content_html = replace(content_html, ${TICKER_OLD_EN}, ${TICKER_NEW_EN}), content_html_hi = replace(content_html_hi, ${TICKER_OLD_HI}, ${TICKER_NEW_HI}), updated_at = now()
        where slug = 'accessibility' and (position(${TICKER_OLD_EN} in content_html) > 0 or position(${TICKER_OLD_HI} in coalesce(content_html_hi, '')) > 0) returning slug`,
  );
  console.log(`Accessibility page: ${count(a11y) ? "ticker sentence corrected" : "nothing to correct"}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
