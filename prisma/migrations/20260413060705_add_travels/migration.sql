-- CreateTable
CREATE TABLE "travels" (
    "id" TEXT NOT NULL,
    "couple_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "cover_url" VARCHAR(500),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'planned',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_spots" (
    "id" TEXT NOT NULL,
    "travel_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "visit_date" DATE,
    "note" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_spots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "travels_couple_id_idx" ON "travels"("couple_id");

-- CreateIndex
CREATE INDEX "travel_spots_travel_id_idx" ON "travel_spots"("travel_id");

-- AddForeignKey
ALTER TABLE "travels" ADD CONSTRAINT "travels_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_spots" ADD CONSTRAINT "travel_spots_travel_id_fkey" FOREIGN KEY ("travel_id") REFERENCES "travels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
