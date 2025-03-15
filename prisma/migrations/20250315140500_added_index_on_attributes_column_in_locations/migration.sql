-- CreateIndex
CREATE INDEX "openmrs_location_attributes_idx" ON "openmrs_location" USING GIN ("attributes");
