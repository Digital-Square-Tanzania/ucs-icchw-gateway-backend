-- CreateTable
CREATE TABLE "location_hierarchy_view" (
    "index" INTEGER NOT NULL,
    "uuid" TEXT NOT NULL,
    "country" TEXT,
    "zone" TEXT,
    "region" TEXT,
    "district" TEXT,
    "council" TEXT,
    "ward" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "location_hierarchy_view_pkey" PRIMARY KEY ("index")
);
