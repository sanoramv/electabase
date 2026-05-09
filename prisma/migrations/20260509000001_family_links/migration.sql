-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'OTHER');

-- CreateTable
CREATE TABLE "politician_relationships" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "related_politician_id" TEXT NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "description" TEXT,
    "source_url" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "politician_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "politician_relationships_politician_id_idx" ON "politician_relationships"("politician_id");

-- CreateIndex
CREATE INDEX "politician_relationships_related_politician_id_idx" ON "politician_relationships"("related_politician_id");

-- CreateIndex
CREATE UNIQUE INDEX "politician_relationships_politician_id_related_politician_id_relationship_type_key" ON "politician_relationships"("politician_id", "related_politician_id", "relationship_type");

-- AddForeignKey
ALTER TABLE "politician_relationships" ADD CONSTRAINT "politician_relationships_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "politician_relationships" ADD CONSTRAINT "politician_relationships_related_politician_id_fkey" FOREIGN KEY ("related_politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
