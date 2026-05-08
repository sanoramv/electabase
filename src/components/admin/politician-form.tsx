"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PoliticianFormData {
  fullName: string;
  displayName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
  highestEducation: string;
  educationInstitution: string;
  professionBeforePolitics: string;
  currentProfession: string;
  netWorthDeclared: string;
  netWorthSourceUrl: string;
  photoUrl: string;
  countryCode: string;
}

interface PoliticianFormProps {
  initialData?: Partial<PoliticianFormData & { id: string; isPublished: boolean }>;
  mode: "create" | "edit";
}

const EMPTY: PoliticianFormData = {
  fullName: "",
  displayName: "",
  dateOfBirth: "",
  placeOfBirth: "",
  gender: "",
  highestEducation: "",
  educationInstitution: "",
  professionBeforePolitics: "",
  currentProfession: "",
  netWorthDeclared: "",
  netWorthSourceUrl: "",
  photoUrl: "",
  countryCode: "IN",
};

export function PoliticianForm({ initialData, mode }: PoliticianFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<PoliticianFormData>({
    ...EMPTY,
    ...(initialData ?? {}),
    dateOfBirth: initialData?.dateOfBirth
      ? new Date(initialData.dateOfBirth).toISOString().split("T")[0]
      : "",
  });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof PoliticianFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(publish = false) {
    const setter = publish ? setPublishing : setSaving;
    setter(true);
    setError(null);

    const payload = {
      ...form,
      dateOfBirth: form.dateOfBirth || undefined,
      netWorthDeclared: form.netWorthDeclared ? parseFloat(form.netWorthDeclared) : undefined,
    };

    let res: Response;
    if (mode === "create") {
      res = await fetch("/api/admin/politicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`/api/admin/politicians/${initialData?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setter(false);
      return;
    }

    const id = mode === "create" ? data.politician.id : initialData?.id;

    if (publish) {
      const pubRes = await fetch(`/api/admin/politicians/${id}/publish`, { method: "POST" });
      const pubData = await pubRes.json();
      if (!pubRes.ok) {
        setError(pubData.error ?? "Publish failed");
        setter(false);
        return;
      }
    }

    setter(false);
    router.push("/admin/politicians");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 w-full">
          Basic Information
        </legend>
        <Field label="Full Name *" required>
          <Input value={form.fullName} onChange={(v) => set("fullName", v)} placeholder="As per official records" />
        </Field>
        <Field label="Display Name">
          <Input value={form.displayName} onChange={(v) => set("displayName", v)} placeholder="Short or popular name" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of Birth">
            <Input type="date" value={form.dateOfBirth} onChange={(v) => set("dateOfBirth", v)} />
          </Field>
          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— select —</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </Field>
        </div>
        <Field label="Place of Birth">
          <Input value={form.placeOfBirth} onChange={(v) => set("placeOfBirth", v)} placeholder="City, State" />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 w-full">
          Education & Career
        </legend>
        <Field label="Highest Education">
          <Input value={form.highestEducation} onChange={(v) => set("highestEducation", v)} placeholder="e.g. B.A. Political Science" />
        </Field>
        <Field label="Education Institution">
          <Input value={form.educationInstitution} onChange={(v) => set("educationInstitution", v)} />
        </Field>
        <Field label="Profession Before Politics">
          <Input value={form.professionBeforePolitics} onChange={(v) => set("professionBeforePolitics", v)} />
        </Field>
        <Field label="Current Profession">
          <Input value={form.currentProfession} onChange={(v) => set("currentProfession", v)} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 w-full">
          Assets & Photo
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Declared Net Worth (₹)">
            <Input type="number" value={form.netWorthDeclared} onChange={(v) => set("netWorthDeclared", v)} placeholder="0" />
          </Field>
          <Field label="Net Worth Source URL">
            <Input type="url" value={form.netWorthSourceUrl} onChange={(v) => set("netWorthSourceUrl", v)} placeholder="https://..." />
          </Field>
        </div>
        <Field label="Photo URL">
          <Input type="url" value={form.photoUrl} onChange={(v) => set("photoUrl", v)} placeholder="https://..." />
        </Field>
        <Field label="Country Code">
          <Input value={form.countryCode} onChange={(v) => set("countryCode", v)} placeholder="IN" />
        </Field>
      </fieldset>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => save(false)}
          disabled={saving || publishing || !form.fullName}
          className="px-4 py-2 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving || publishing || !form.fullName}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {publishing ? "Publishing..." : "Save & Publish"}
        </button>
        <button
          onClick={() => router.push("/admin/politicians")}
          className="px-4 py-2 text-gray-600 text-sm hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
