import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Disclaimer",
  description: "ElectaBase legal disclaimer — informational aggregator of publicly available political data.",
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal Disclaimer</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Nature of This Website</h2>
          <p>
            ElectaBase is an <strong>informational aggregator</strong> and not a publisher of original claims.
            ElectaBase compiles, organises, and displays data that is already in the public domain,
            sourced exclusively from authentic government portals, judicial records, and recognised
            civic organisations. ElectaBase does not conduct original investigations, make editorial
            judgements, or express any opinion — political or otherwise — about any individual, party,
            or institution.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Source Attribution</h2>
          <p>
            Every data point displayed on this website carries a clickable source link pointing to the
            original authentic record. Users are strongly encouraged to verify all information by
            consulting the linked primary source. In case of any discrepancy between data shown on
            ElectaBase and the primary source, the primary source shall be treated as definitive.
          </p>
          <p className="mt-2">
            Accepted authentic sources include, but are not limited to: the Election Commission of
            India (ECI), official Lok Sabha and Rajya Sabha portals, the Ministry of Corporate
            Affairs (MCA), Income Tax disclosures made public under legal obligation, official court
            records, RTI responses, PRS Legislative Research, and the Association for Democratic
            Reforms (ADR).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">No Editorial Judgement</h2>
          <p>
            ElectaBase does not make editorial judgements about any politician, party, or institution.
            All scores (Effectiveness Score, Corruption Score) are computed by deterministic,
            formula-driven algorithms applied identically to all politicians regardless of party,
            religion, gender, caste, or ideology. The scoring formulae are publicly documented on the{" "}
            <a href="/about" className="text-blue-600 hover:underline">About &amp; Methodology</a> page.
          </p>
          <p className="mt-2">
            The presence of a criminal case, corruption record, or controversy on this website reflects
            information available in public records and does not constitute a finding of guilt. The
            algorithms do not presume guilt — pending and appealing cases carry partial weight and
            acquittals reduce the score.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Accuracy and Updates</h2>
          <p>
            ElectaBase makes reasonable efforts to ensure accuracy. Data is refreshed automatically
            every Sunday at 2:00 AM IST and is subject to correction through the official{" "}
            <a href="/corrections" className="text-blue-600 hover:underline">correction submission form</a>.
            However, ElectaBase cannot guarantee the real-time accuracy of all records and disclaims
            liability for any inaccuracy, error, or omission in the displayed data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">No Defamation or Malice</h2>
          <p>
            ElectaBase does not publish any data with the intention of harming any individual&apos;s
            reputation. All information displayed is sourced from public records that are accessible
            to every citizen. The reproduction and organisation of such public information for civic
            purposes is protected under the right to free expression and the public&apos;s right to
            information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Corrections</h2>
          <p>
            If you believe any information displayed on this website is inaccurate, you may submit a
            correction through our{" "}
            <a href="/corrections" className="text-blue-600 hover:underline">correction form</a>.
            All corrections are reviewed by an administrator before being applied. Corrections must
            include a verifiable source link to an authentic record.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, ElectaBase and its operators shall not
            be liable for any direct, indirect, incidental, special, or consequential damages arising
            from the use of this website or reliance on information displayed herein. Use of this
            website constitutes acceptance of this disclaimer.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Governing Law</h2>
          <p>
            This disclaimer is governed by and construed in accordance with the laws of India.
            Any disputes arising out of or relating to this website shall be subject to the
            jurisdiction of the courts of India.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Contact</h2>
          <p>
            For enquiries regarding data accuracy, legal matters, or corrections, please use the{" "}
            <a href="/corrections" className="text-blue-600 hover:underline">correction submission form</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
