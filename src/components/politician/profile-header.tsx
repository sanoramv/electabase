import Image from "next/image";
import { CorrectionLink } from "./correction-link";
import { SourceBadge } from "./source-badge";

interface ProfileHeaderProps {
  id: string;
  fullName: string;
  photoUrl?: string | null;
  currentParty?: { name: string } | null;
  age?: number | null;
  gender?: string | null;
  placeOfBirth?: string | null;
  highestEducation?: string | null;
  netWorthDeclared?: number | null;
  netWorthSourceUrl?: string | null;
}

export function ProfileHeader({
  id,
  fullName,
  photoUrl,
  currentParty,
  age,
  gender,
  placeOfBirth,
  highestEducation,
  netWorthDeclared,
  netWorthSourceUrl,
}: ProfileHeaderProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start gap-6">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={fullName}
            width={80}
            height={80}
            className="rounded-full object-cover w-20 h-20 flex-shrink-0"
            priority
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-bold flex-shrink-0">
            {fullName[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          {currentParty && (
            <p className="text-gray-600 mt-0.5">{currentParty.name}</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            {age && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Age:</span>
                <span className="text-gray-800">{age}</span>
                <CorrectionLink politicianId={id} fieldName="dateOfBirth" />
              </div>
            )}
            {gender && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Gender:</span>
                <span className="text-gray-800">{gender}</span>
                <CorrectionLink politicianId={id} fieldName="gender" />
              </div>
            )}
            {placeOfBirth && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Born:</span>
                <span className="text-gray-800">{placeOfBirth}</span>
                <CorrectionLink politicianId={id} fieldName="placeOfBirth" />
              </div>
            )}
            {highestEducation && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Education:</span>
                <span className="text-gray-800">{highestEducation}</span>
                <CorrectionLink politicianId={id} fieldName="highestEducation" />
              </div>
            )}
            {netWorthDeclared !== null && netWorthDeclared !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Net Worth:</span>
                <span className="text-gray-800">
                  ₹{Number(netWorthDeclared).toLocaleString("en-IN")}
                </span>
                {netWorthSourceUrl && (
                  <SourceBadge sourceUrl={netWorthSourceUrl} label="Net worth source" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
