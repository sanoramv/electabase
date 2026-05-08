export function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-xs text-amber-800">
      <strong>Important Notice:</strong> This profile is compiled from publicly
      available authentic sources. ElectaBase is an informational aggregator and
      does not express editorial opinion. All data points are linked to their
      original sources. If you believe any information is incorrect, please use
      the &ldquo;Suggest Correction&rdquo; link next to the relevant data point.
      See the full{" "}
      <a href="/legal/disclaimer" className="underline font-medium">
        legal disclaimer
      </a>
      .
    </div>
  );
}
