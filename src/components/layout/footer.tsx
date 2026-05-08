import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">ElectaBase</h3>
            <p className="mt-2 text-xs text-gray-500">
              India&apos;s political transparency database. Every politician.
              Every record. Every source.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Resources</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href="/about"
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Methodology
                </Link>
              </li>
              <li>
                <Link
                  href="/corrections"
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Submit a Correction
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href="/legal/disclaimer"
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-xs text-gray-500">
            <strong>Disclaimer:</strong> ElectaBase is an informational
            aggregator of publicly available political data. All data is sourced
            from authentic government and civic records with clickable source
            links. ElectaBase does not make editorial judgments or publish
            original claims. Users are encouraged to verify all information at
            the linked source. Data corrections can be submitted via the{" "}
            <Link href="/corrections" className="underline">
              correction form
            </Link>
            . See the full{" "}
            <Link href="/legal/disclaimer" className="underline">
              legal disclaimer
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
