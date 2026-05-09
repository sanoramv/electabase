"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CompareModal } from "@/components/politicians/compare-modal";

interface PoliticianRow {
  id: string;
  slug: string;
  fullName: string;
  photoUrl: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  currentParty: { name: string; abbreviation: string; slug: string } | null;
  effectivenessScores: Array<{ score: string | number }>;
  corruptionScores: Array<{ score: string | number }>;
  attendanceRecords: Array<{ attendancePercentage: string | number }>;
  electionContests: Array<{ state: string | null }>;
}

type SortKey =
  | "name"
  | "party"
  | "state"
  | "age"
  | "effectiveness"
  | "corruption"
  | "attendance";
type SortDir = "asc" | "desc";

interface PartyOption {
  name: string;
  abbreviation: string;
  slug: string;
}

interface PoliticiansClientProps {
  parties: PartyOption[];
  states: string[];
}

function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  labelKey,
  valueKey,
}: {
  label: string;
  options: Array<Record<string, string>>;
  selected: string[];
  onChange: (vals: string[]) => void;
  labelKey: string;
  valueKey: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(val: string) {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  }

  const buttonLabel =
    selected.length === 0
      ? `All ${label}`
      : selected.length === 1
      ? options.find((o) => o[valueKey] === selected[0])?.[labelKey] ?? "1 selected"
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between border border-gray-300 rounded px-3 py-2 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate text-gray-700">{buttonLabel}</span>
        <span className="ml-2 text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt[valueKey]}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt[valueKey])}
                onChange={() => toggle(opt[valueKey])}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">{opt[labelKey]}</span>
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No options</p>
          )}
        </div>
      )}
    </div>
  );
}

function SortButton({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 whitespace-nowrap font-medium text-xs ${
        isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
      <span className="text-xs">
        {isActive ? (currentDir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

const PAGE_SIZE = 20;

export function PoliticiansClient({ parties, states }: PoliticiansClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL params
  const initialQ = searchParams.get("q") ?? "";
  const initialSort = searchParams.get("sort") ?? "name:asc";
  const [initialSortKey, initialSortDir] = initialSort.split(":") as [
    SortKey,
    SortDir
  ];
  const initialParties = searchParams.get("party")
    ? searchParams.get("party")!.split(",").filter(Boolean)
    : [];
  const initialStates = searchParams.get("state")
    ? searchParams.get("state")!.split(",").filter(Boolean)
    : [];
  const initialMinAge = searchParams.get("minAge")
    ? Number(searchParams.get("minAge"))
    : undefined;
  const initialMaxAge = searchParams.get("maxAge")
    ? Number(searchParams.get("maxAge"))
    : undefined;
  const initialMinEff = searchParams.get("minEff")
    ? Number(searchParams.get("minEff"))
    : undefined;
  const initialMaxEff = searchParams.get("maxEff")
    ? Number(searchParams.get("maxEff"))
    : undefined;
  const initialMinCorr = searchParams.get("minCorr")
    ? Number(searchParams.get("minCorr"))
    : undefined;
  const initialMaxCorr = searchParams.get("maxCorr")
    ? Number(searchParams.get("maxCorr"))
    : undefined;
  const initialPage = searchParams.get("page")
    ? Number(searchParams.get("page"))
    : 1;

  // State
  const [allPoliticians, setAllPoliticians] = useState<PoliticianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [inputQ, setInputQ] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [debouncing, setDebouncing] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey ?? "name");
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir ?? "asc");

  const [selectedParties, setSelectedParties] = useState<string[]>(initialParties);
  const [selectedStates, setSelectedStates] = useState<string[]>(initialStates);

  const [minAge, setMinAge] = useState<string>(
    initialMinAge !== undefined ? String(initialMinAge) : ""
  );
  const [maxAge, setMaxAge] = useState<string>(
    initialMaxAge !== undefined ? String(initialMaxAge) : ""
  );
  const [minEff, setMinEff] = useState<string>(
    initialMinEff !== undefined ? String(initialMinEff) : ""
  );
  const [maxEff, setMaxEff] = useState<string>(
    initialMaxEff !== undefined ? String(initialMaxEff) : ""
  );
  const [minCorr, setMinCorr] = useState<string>(
    initialMinCorr !== undefined ? String(initialMinCorr) : ""
  );
  const [maxCorr, setMaxCorr] = useState<string>(
    initialMaxCorr !== undefined ? String(initialMaxCorr) : ""
  );

  const [page, setPage] = useState(initialPage);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  // Fetch on mount
  useEffect(() => {
    async function fetchPoliticians() {
      try {
        setLoading(true);
        const res = await fetch("/api/politicians?limit=100");
        if (!res.ok) throw new Error("Failed to fetch politicians");
        const data = await res.json();
        setAllPoliticians(data.politicians);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPoliticians();
  }, []);

  // Debounce search
  useEffect(() => {
    if (inputQ === q) return;
    setDebouncing(true);
    const timer = setTimeout(() => {
      setQ(inputQ);
      setPage(1);
      setDebouncing(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputQ, q]);

  // Sync URL params
  const updateUrl = useCallback(
    (overrides: Record<string, string | undefined> = {}) => {
      const params = new URLSearchParams();
      const effectiveQ = overrides.q !== undefined ? overrides.q : q;
      const effectiveSortKey =
        overrides.sortKey !== undefined ? overrides.sortKey : sortKey;
      const effectiveSortDir =
        overrides.sortDir !== undefined ? overrides.sortDir : sortDir;
      const effectiveParties =
        overrides.parties !== undefined
          ? overrides.parties
          : selectedParties.join(",");
      const effectiveStates =
        overrides.states !== undefined
          ? overrides.states
          : selectedStates.join(",");
      const effectivePage =
        overrides.page !== undefined ? overrides.page : String(page);

      if (effectiveQ) params.set("q", effectiveQ);
      if (effectiveSortKey !== "name" || effectiveSortDir !== "asc")
        params.set("sort", `${effectiveSortKey}:${effectiveSortDir}`);
      if (effectiveParties) params.set("party", effectiveParties);
      if (effectiveStates) params.set("state", effectiveStates);
      if (minAge) params.set("minAge", minAge);
      if (maxAge) params.set("maxAge", maxAge);
      if (minEff) params.set("minEff", minEff);
      if (maxEff) params.set("maxEff", maxEff);
      if (minCorr) params.set("minCorr", minCorr);
      if (maxCorr) params.set("maxCorr", maxCorr);
      if (effectivePage !== "1") params.set("page", effectivePage);

      const qs = params.toString();
      router.replace(`/politicians${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [
      q,
      sortKey,
      sortDir,
      selectedParties,
      selectedStates,
      minAge,
      maxAge,
      minEff,
      maxEff,
      minCorr,
      maxCorr,
      page,
      router,
    ]
  );

  // Update URL when state changes
  useEffect(() => {
    updateUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    q,
    sortKey,
    sortDir,
    selectedParties,
    selectedStates,
    minAge,
    maxAge,
    minEff,
    maxEff,
    minCorr,
    maxCorr,
    page,
  ]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function clearFilters() {
    setSelectedParties([]);
    setSelectedStates([]);
    setMinAge("");
    setMaxAge("");
    setMinEff("");
    setMaxEff("");
    setMinCorr("");
    setMaxCorr("");
    setPage(1);
  }

  const hasFilters =
    selectedParties.length > 0 ||
    selectedStates.length > 0 ||
    minAge !== "" ||
    maxAge !== "" ||
    minEff !== "" ||
    maxEff !== "" ||
    minCorr !== "" ||
    maxCorr !== "";

  // Filter + sort + paginate
  const filtered = useMemo(() => {
    let list = allPoliticians;

    // Search
    if (q.trim()) {
      const lower = q.trim().toLowerCase();
      list = list.filter((p) => p.fullName.toLowerCase().includes(lower));
    }

    // Party filter
    if (selectedParties.length > 0) {
      list = list.filter(
        (p) => p.currentParty && selectedParties.includes(p.currentParty.slug)
      );
    }

    // State filter
    if (selectedStates.length > 0) {
      list = list.filter((p) => {
        const state = p.electionContests[0]?.state;
        return state && selectedStates.includes(state);
      });
    }

    // Age filter
    if (minAge !== "" || maxAge !== "") {
      list = list.filter((p) => {
        const age = computeAge(p.dateOfBirth);
        if (age === null) return false;
        if (minAge !== "" && age < Number(minAge)) return false;
        if (maxAge !== "" && age > Number(maxAge)) return false;
        return true;
      });
    }

    // Effectiveness filter
    if (minEff !== "" || maxEff !== "") {
      list = list.filter((p) => {
        const score = p.effectivenessScores[0]
          ? Number(p.effectivenessScores[0].score)
          : null;
        if (score === null) return false;
        if (minEff !== "" && score < Number(minEff)) return false;
        if (maxEff !== "" && score > Number(maxEff)) return false;
        return true;
      });
    }

    // Corruption filter
    if (minCorr !== "" || maxCorr !== "") {
      list = list.filter((p) => {
        const score = p.corruptionScores[0]
          ? Number(p.corruptionScores[0].score)
          : null;
        if (score === null) return false;
        if (minCorr !== "" && score < Number(minCorr)) return false;
        if (maxCorr !== "" && score > Number(maxCorr)) return false;
        return true;
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.fullName.localeCompare(b.fullName);
          break;
        case "party":
          cmp = (a.currentParty?.abbreviation ?? "").localeCompare(
            b.currentParty?.abbreviation ?? ""
          );
          break;
        case "state":
          cmp = (a.electionContests[0]?.state ?? "").localeCompare(
            b.electionContests[0]?.state ?? ""
          );
          break;
        case "age": {
          const ageA = computeAge(a.dateOfBirth) ?? -1;
          const ageB = computeAge(b.dateOfBirth) ?? -1;
          cmp = ageA - ageB;
          break;
        }
        case "effectiveness": {
          const effA = a.effectivenessScores[0]
            ? Number(a.effectivenessScores[0].score)
            : -1;
          const effB = b.effectivenessScores[0]
            ? Number(b.effectivenessScores[0].score)
            : -1;
          cmp = effA - effB;
          break;
        }
        case "corruption": {
          const corrA = a.corruptionScores[0]
            ? Number(a.corruptionScores[0].score)
            : -1;
          const corrB = b.corruptionScores[0]
            ? Number(b.corruptionScores[0].score)
            : -1;
          cmp = corrA - corrB;
          break;
        }
        case "attendance": {
          const attA = a.attendanceRecords[0]
            ? Number(a.attendanceRecords[0].attendancePercentage)
            : -1;
          const attB = b.attendanceRecords[0]
            ? Number(b.attendanceRecords[0].attendancePercentage)
            : -1;
          cmp = attA - attB;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [
    allPoliticians,
    q,
    selectedParties,
    selectedStates,
    minAge,
    maxAge,
    minEff,
    maxEff,
    minCorr,
    maxCorr,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleCompare(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else if (next.size < 4) {
        next.add(slug);
      }
      return next;
    });
  }

  const partyOptions = parties.map((p) => ({
    label: p.abbreviation,
    value: p.slug,
  }));
  const stateOptions = states.map((s) => ({ label: s, value: s }));

  return (
    <>
      {/* Top bar: filter toggle + search */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-1.5 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Filters {filtersOpen ? "▲" : "▾"}
          {hasFilters && (
            <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
              active
            </span>
          )}
        </button>

        <div className="relative flex-1 max-w-sm">
          <input
            type="search"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="Search politicians by name..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {debouncing && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <svg
                className="animate-spin h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Party
              </label>
              <MultiSelect
                label="parties"
                options={partyOptions.map((o) => ({
                  label: o.label,
                  value: o.value,
                }))}
                selected={selectedParties}
                onChange={(vals) => {
                  setSelectedParties(vals);
                  setPage(1);
                }}
                labelKey="label"
                valueKey="value"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                State
              </label>
              <MultiSelect
                label="states"
                options={stateOptions.map((o) => ({
                  label: o.label,
                  value: o.value,
                }))}
                selected={selectedStates}
                onChange={(vals) => {
                  setSelectedStates(vals);
                  setPage(1);
                }}
                labelKey="label"
                valueKey="value"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Age
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAge}
                  onChange={(e) => {
                    setMinAge(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAge}
                  onChange={(e) => {
                    setMaxAge(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Effectiveness Score
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minEff}
                  onChange={(e) => {
                    setMinEff(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxEff}
                  onChange={(e) => {
                    setMaxEff(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Corruption Score
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minCorr}
                  onChange={(e) => {
                    setMinCorr(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxCorr}
                  onChange={(e) => {
                    setMaxCorr(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-4">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading / error states */}
      {loading && (
        <div className="text-center py-16 text-gray-400">
          <p>Loading politicians...</p>
        </div>
      )}

      {fetchError && (
        <div className="text-center py-16 text-red-500">
          <p>Error: {fetchError}</p>
        </div>
      )}

      {!loading && !fetchError && (
        <>
          {/* Result count */}
          <p className="text-xs text-gray-400 mb-3">
            {filtered.length.toLocaleString()} politician
            {filtered.length !== 1 ? "s" : ""} found
            {selected.size > 0 && (
              <span className="ml-2 text-blue-600">
                · {selected.size} selected for comparison (up to 4)
              </span>
            )}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No politicians found matching your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-8 px-3 py-3">
                      {/* Compare checkbox col */}
                    </th>
                    <th className="w-10 px-2 py-3 hidden sm:table-cell">
                      {/* Photo col */}
                    </th>
                    <th className="px-3 py-3 text-left">
                      <SortButton
                        label="Name"
                        sortKey="name"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-3 text-left hidden sm:table-cell">
                      <SortButton
                        label="Party"
                        sortKey="party"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-3 text-left hidden md:table-cell">
                      <SortButton
                        label="State"
                        sortKey="state"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-3 align-middle hidden md:table-cell">
                      <div className="flex justify-end">
                        <SortButton
                          label="Age"
                          sortKey="age"
                          currentKey={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </div>
                    </th>
                    <th className="px-3 py-3 align-middle">
                      <div className="flex justify-end">
                        <SortButton
                          label="Eff"
                          sortKey="effectiveness"
                          currentKey={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </div>
                    </th>
                    <th className="px-3 py-3 align-middle hidden sm:table-cell">
                      <div className="flex justify-end">
                        <SortButton
                          label="Corr"
                          sortKey="corruption"
                          currentKey={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </div>
                    </th>
                    <th className="px-3 py-3 align-middle hidden md:table-cell">
                      <div className="flex justify-end">
                        <SortButton
                          label="Attendance"
                          sortKey="attendance"
                          currentKey={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginated.map((p) => {
                    const age = computeAge(p.dateOfBirth);
                    const effScore = p.effectivenessScores[0]
                      ? Number(p.effectivenessScores[0].score)
                      : null;
                    const corrScore = p.corruptionScores[0]
                      ? Number(p.corruptionScores[0].score)
                      : null;
                    const attPct = p.attendanceRecords[0]
                      ? Number(p.attendanceRecords[0].attendancePercentage)
                      : null;
                    const state = p.electionContests[0]?.state ?? null;
                    const isSelected = selected.has(p.slug);

                    return (
                      <tr
                        key={p.slug}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                        onClick={() =>
                          router.push(`/politicians/${p.slug}`)
                        }
                      >
                        {/* Compare checkbox */}
                        <td
                          className="px-3 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCompare(p.slug)}
                            disabled={!isSelected && selected.size >= 4}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            aria-label={`Select ${p.fullName} for comparison`}
                          />
                        </td>

                        {/* Photo */}
                        <td className="px-2 py-3 hidden sm:table-cell">
                          {p.photoUrl ? (
                            <Image
                              src={p.photoUrl}
                              alt={p.fullName}
                              width={40}
                              height={40}
                              className="rounded-full object-cover w-10 h-10"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-bold">
                              {p.fullName[0]}
                            </div>
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-3 py-3">
                          <Link
                            href={`/politicians/${p.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {p.fullName}
                          </Link>
                        </td>

                        {/* Party */}
                        <td
                          className="px-3 py-3 hidden sm:table-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.currentParty ? (
                            <Link
                              href={`/parties/${p.currentParty.slug}`}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              {p.currentParty.abbreviation}
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* State */}
                        <td className="px-3 py-3 text-gray-500 hidden md:table-cell">
                          {state ?? "—"}
                        </td>

                        {/* Age */}
                        <td className="px-3 py-3 text-right align-middle text-gray-500 hidden md:table-cell">
                          {age !== null ? age : "—"}
                        </td>

                        {/* Effectiveness */}
                        <td className="px-3 py-3 text-right align-middle">
                          {effScore !== null ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {effScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Corruption */}
                        <td className="px-3 py-3 text-right align-middle hidden sm:table-cell">
                          {corrScore !== null ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              {corrScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Attendance */}
                        <td className="px-3 py-3 text-right align-middle text-gray-500 hidden md:table-cell">
                          {attPct !== null ? `${attPct.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Sticky compare bar */}
      {selected.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{selected.size}</span>{" "}
              politicians selected
              {selected.size < 4 && (
                <span className="text-gray-400 ml-1">(up to 4)</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 min-h-[44px]"
              >
                Compare Selected →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare modal */}
      {compareOpen && (
        <CompareModal
          slugs={[...selected]}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </>
  );
}
