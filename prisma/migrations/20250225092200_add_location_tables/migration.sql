-- CreateTable
CREATE TABLE "location" (
    "location_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city_village" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "creator" INTEGER NOT NULL,
    "date_created" TIMESTAMP(3) NOT NULL,
    "county_district" TEXT,
    "address3" TEXT,
    "address4" TEXT,
    "address5" TEXT,
    "address6" TEXT,
    "retired" BOOLEAN NOT NULL DEFAULT false,
    "retired_by" INTEGER,
    "date_retired" TIMESTAMP(3),
    "retire_reason" TEXT,
    "parent_location" INTEGER,
    "uuid" TEXT NOT NULL,
    "changed_by" INTEGER,
    "date_changed" TIMESTAMP(3),
    "address7" TEXT,
    "address8" TEXT,
    "address9" TEXT,
    "address10" TEXT,
    "address11" TEXT,
    "address12" TEXT,
    "address13" TEXT,
    "address14" TEXT,
    "address15" TEXT,

    CONSTRAINT "location_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "location_tag" (
    "location_tag_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creator" INTEGER NOT NULL,
    "date_created" TIMESTAMP(3) NOT NULL,
    "retired" BOOLEAN NOT NULL DEFAULT false,
    "retired_by" INTEGER,
    "date_retired" TIMESTAMP(3),
    "retire_reason" TEXT,
    "uuid" TEXT NOT NULL,
    "changed_by" INTEGER,
    "date_changed" TIMESTAMP(3),

    CONSTRAINT "location_tag_pkey" PRIMARY KEY ("location_tag_id")
);

-- CreateTable
CREATE TABLE "location_tag_map" (
    "location_id" INTEGER NOT NULL,
    "location_tag_id" INTEGER NOT NULL,

    CONSTRAINT "location_tag_map_pkey" PRIMARY KEY ("location_id","location_tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_uuid_key" ON "location"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "location_tag_uuid_key" ON "location_tag"("uuid");

-- AddForeignKey
ALTER TABLE "location_tag_map" ADD CONSTRAINT "location_tag_map_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_tag_map" ADD CONSTRAINT "location_tag_map_location_tag_id_fkey" FOREIGN KEY ("location_tag_id") REFERENCES "location_tag"("location_tag_id") ON DELETE RESTRICT ON UPDATE CASCADE;
