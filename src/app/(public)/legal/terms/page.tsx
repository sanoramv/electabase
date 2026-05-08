import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "ElectaBase terms of use — conditions for accessing and using this website.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Use</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Acceptance of Terms</h2>
          <p>
            By accessing or using ElectaBase (&quot;the Website&quot;), you agree to be bound by these Terms
            of Use. If you do not agree with any part of these terms, you must not use this Website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Purpose of the Website</h2>
          <p>
            ElectaBase is a civic-technology informational platform that aggregates and displays
            publicly available political data about Indian politicians for the purpose of promoting
            transparency, accountability, and informed democratic participation. It is not a news
            publication, a political organisation, or an official government resource.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Permitted Use</h2>
          <p>You may:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Browse and search politician profiles for personal, journalistic, research, or civic purposes.</li>
            <li>Share links to politician profiles and public pages.</li>
            <li>Submit data corrections through the official correction form.</li>
            <li>Cite ElectaBase as a secondary source, with attribution and a link to the original source URL.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Prohibited Use</h2>
          <p>You must not:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Use automated scrapers, bots, or crawlers to extract data at scale without prior written consent.</li>
            <li>Reproduce, republish, or redistribute substantial portions of ElectaBase data for commercial purposes without attribution and without consent.</li>
            <li>Use the data to harass, defame, or target any individual.</li>
            <li>Submit false corrections with the intent to corrupt the database.</li>
            <li>Attempt to gain unauthorised access to the admin panel or database.</li>
            <li>Circumvent rate limits or security measures.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Intellectual Property</h2>
          <p>
            The underlying data displayed on ElectaBase is sourced from public records and does not
            belong to ElectaBase. The website&apos;s design, code, scoring algorithms, and original
            editorial elements are the intellectual property of the ElectaBase operators and are
            protected by applicable copyright law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Corrections and Accuracy</h2>
          <p>
            ElectaBase makes good-faith efforts to ensure accuracy but does not warrant the
            completeness or timeliness of any information. Users who identify inaccuracies are
            encouraged to submit a correction via the{" "}
            <a href="/corrections" className="text-blue-600 hover:underline">correction form</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Disclaimer of Warranties</h2>
          <p>
            This Website is provided &quot;as is&quot; without any warranties, express or implied. ElectaBase
            disclaims all warranties including but not limited to warranties of merchantability,
            fitness for a particular purpose, and non-infringement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, ElectaBase and its operators shall not be liable
            for any indirect, incidental, special, or consequential damages resulting from your use
            of the Website or reliance on any information displayed thereon.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Changes to These Terms</h2>
          <p>
            ElectaBase reserves the right to modify these Terms of Use at any time. Continued use
            of the Website following any changes constitutes acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Governing Law</h2>
          <p>
            These Terms of Use shall be governed by and construed in accordance with the laws of
            India. Any disputes shall be subject to the exclusive jurisdiction of the courts of India.
          </p>
        </section>
      </div>
    </div>
  );
}
