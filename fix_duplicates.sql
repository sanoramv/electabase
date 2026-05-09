-- fix_duplicates.sql
-- Deduplication for near-identical politician names.
--
-- INVESTIGATION RESULTS:
--
-- A. Annamalai: Only ONE record exists in the politicians table (id: cmox21kgl002r3iqn7ifcruid).
--   No duplicate found — no action needed for this politician.
--
-- C Chandrasekaran / C. Chandrasekaran: Two records exist with near-identical names.
--   HOWEVER, these appear to be DIFFERENT PEOPLE:
--     id: cmoylzdcu003fwmt5aybaizei | "C Chandrasekaran"   | AIADMK     | SENTHAMANGALAM(ST) | myneta candidate_id=1239
--     id: cmoylzds4003hwmt59gqbhyw7 | "C. Chandrasekaran"  | TDMK       | PAPANASAM          | myneta candidate_id=2401
--   Different parties, different constituencies, different myneta IDs confirm these are two separate individuals.
--
-- RECOMMENDATION: Do NOT run the merge below unless you have confirmed these are the same person.
-- If they are confirmed to be the same person, decide which record to KEEP before running.
--
-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- MERGE TEMPLATE (edit KEEP_ID and DELETE_ID before running)
-- KEEP_ID   = the politician_id to retain
-- DELETE_ID = the politician_id to remove after merging its data
-- ─────────────────────────────────────────────────────────────────────────────────────────────

-- Set these before running:
-- KEEP_ID   = 'cmoylzdcu003fwmt5aybaizei'   -- C Chandrasekaran (AIADMK, SENTHAMANGALAM)
-- DELETE_ID = 'cmoylzds4003hwmt59gqbhyw7'   -- C. Chandrasekaran (TDMK, PAPANASAM)

BEGIN;

-- Reassign all related records from DELETE_ID → KEEP_ID
UPDATE crime_records       SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE corruption_records  SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE election_contests   SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE effectiveness_scores SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE corruption_scores   SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE party_affiliations  SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE achievements        SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE correction_submissions SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE politician_relationships SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE politician_relationships SET related_politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE related_politician_id = 'cmoylzds4003hwmt59gqbhyw7';
UPDATE parliamentary_tenures SET politician_id = 'cmoylzdcu003fwmt5aybaizei' WHERE politician_id = 'cmoylzds4003hwmt59gqbhyw7';

-- Delete the duplicate politician record
DELETE FROM politicians WHERE id = 'cmoylzds4003hwmt59gqbhyw7';

COMMIT;
