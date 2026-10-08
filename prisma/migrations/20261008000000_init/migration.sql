CREATE TABLE "Product" (
"id" TEXT NOT NULL, "slug" TEXT NOT NULL, "name" TEXT NOT NULL, "brand" TEXT NOT NULL,
"sourceUrl" TEXT, "category" TEXT NOT NULL, "description" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'draft',
"spec" JSONB NOT NULL, "media" JSONB NOT NULL, "hotspots" JSONB NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
