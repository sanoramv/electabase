import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { PoliticianForm } from "@/components/admin/politician-form";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Politician — Admin" };

export default async function EditPoliticianPage({ params }: Props) {
  const { id } = await params;

  const politician = await db.politician.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      displayName: true,
      dateOfBirth: true,
      placeOfBirth: true,
      gender: true,
      highestEducation: true,
      educationInstitution: true,
      professionBeforePolitics: true,
      currentProfession: true,
      netWorthDeclared: true,
      netWorthSourceUrl: true,
      photoUrl: true,
      countryCode: true,
      isPublished: true,
    },
  });

  if (!politician) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Politician</h1>
      <p className="text-sm text-gray-500 mb-6">{politician.fullName}</p>
      <PoliticianForm
        mode="edit"
        initialData={{
          ...politician,
          dateOfBirth: politician.dateOfBirth?.toISOString() ?? "",
          netWorthDeclared: politician.netWorthDeclared
            ? String(politician.netWorthDeclared)
            : "",
          displayName: politician.displayName ?? "",
          placeOfBirth: politician.placeOfBirth ?? "",
          gender: politician.gender ?? "",
          highestEducation: politician.highestEducation ?? "",
          educationInstitution: politician.educationInstitution ?? "",
          professionBeforePolitics: politician.professionBeforePolitics ?? "",
          currentProfession: politician.currentProfession ?? "",
          netWorthSourceUrl: politician.netWorthSourceUrl ?? "",
          photoUrl: politician.photoUrl ?? "",
        }}
      />
    </div>
  );
}
