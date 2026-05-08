import { PoliticianForm } from "@/components/admin/politician-form";

export const metadata = { title: "Add Politician — Admin" };

export default function NewPoliticianPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Politician</h1>
      <PoliticianForm mode="create" />
    </div>
  );
}
