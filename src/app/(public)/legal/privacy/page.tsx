import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ElectaBase privacy policy — how we handle your data under India's DPDP Act 2023.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: January 2025 · Compliant with India&apos;s Digital Personal Data Protection Act 2023</p>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Overview</h2>
          <p>
            ElectaBase is committed to protecting your personal data. This Privacy Policy describes
            what data we collect, why we collect it, how it is used, and how it is protected —
            in compliance with India&apos;s <strong>Digital Personal Data Protection (DPDP) Act 2023</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Data We Collect</h2>
          <h3 className="text-base font-semibold text-gray-800 mb-2">Visitors (no account)</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do not require registration to use this website.</li>
            <li>Standard web server logs (IP address, browser type, pages visited) may be collected for security and analytics purposes.</li>
            <li>No cookies beyond those strictly necessary for the site to function are set.</li>
          </ul>

          <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Correction Submissions</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>When you submit a data correction, we collect your <strong>email address</strong> for the sole purpose of admin contact if clarification is required.</li>
            <li>Your email address is used only for that correction and is never used for marketing.</li>
            <li>Upon final resolution (approval or rejection) of your correction, your email address is <strong>permanently anonymised</strong>: it is replaced with a one-way SHA-256 hash and the original address is deleted from our records.</li>
            <li>This anonymisation is irreversible and automatic.</li>
          </ul>

          <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Administrators</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Admin accounts are provisioned by the site operators only.</li>
            <li>Login is via magic link (email OTP). No passwords are stored.</li>
            <li>All admin actions are logged with a timestamp and admin ID for audit purposes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Data We Do Not Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do not collect names, phone numbers, or any identifiers beyond email (for corrections only).</li>
            <li>We do not build advertising profiles or track users across websites.</li>
            <li>We do not sell or share personal data with third parties.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Politician Data</h2>
          <p>
            Data displayed about politicians (public figures) is sourced exclusively from
            public records — government portals, judicial records, and civic databases. This
            data is provided in the public interest. Politicians, as public figures performing
            public duties, have reduced expectation of privacy with respect to their exercise of
            those duties under applicable law.
          </p>
          <p className="mt-2">
            If you are a politician and believe that any data displayed is inaccurate, please
            use the <a href="/corrections" className="text-blue-600 hover:underline">correction form</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Data Retention</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Correction submission email addresses are permanently anonymised upon review (approval or rejection).</li>
            <li>Web server logs are retained for up to 30 days for security purposes.</li>
            <li>Admin action logs are retained indefinitely for audit purposes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Your Rights under DPDP Act 2023</h2>
          <p>Under the Digital Personal Data Protection Act 2023, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Access</strong> personal data we hold about you</li>
            <li><strong>Correction</strong> of inaccurate data</li>
            <li><strong>Erasure</strong> of data where permitted by law</li>
            <li><strong>Grievance redressal</strong> — contact details below</li>
          </ul>
          <p className="mt-2">
            Note: Once a correction submission&apos;s email has been anonymised (SHA-256 hashed),
            it cannot be de-anonymised or deleted further — this is by design to comply with both
            data minimisation principles and audit requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Third-Party Services</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — database and authentication (data stored in compliance with applicable laws)</li>
            <li><strong>Vercel</strong> — hosting and CDN</li>
            <li><strong>Cloudflare</strong> — CDN and DDoS protection</li>
            <li><strong>Google AdSense</strong> — advertising (subject to Google&apos;s own privacy policy)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Contact</h2>
          <p>
            For privacy-related queries or to exercise your rights under the DPDP Act 2023,
            please use the <a href="/corrections" className="text-blue-600 hover:underline">correction form</a>{" "}
            or contact us at the address provided in our legal notice.
          </p>
        </section>
      </div>
    </div>
  );
}
