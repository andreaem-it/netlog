-- CreateTable
CREATE TABLE "albums" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_photos" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "albums_owner_id_created_at_idx" ON "albums"("owner_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "album_photos_asset_id_key" ON "album_photos"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "album_photos_album_id_position_key" ON "album_photos"("album_id", "position");

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_album_id_fkey"
  FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_asset_id_fkey"
  FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK: position must be non-negative, same convention as post_images.
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photo_position_positive" CHECK ("position" >= 0);
