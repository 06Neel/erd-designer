-- E-Commerce Database Schema
-- PostgreSQL

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "username" VARCHAR(100) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "first_name" VARCHAR(100),
  "last_name" VARCHAR(100),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL UNIQUE,
  "parent_id" INTEGER,
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "stock_quantity" INTEGER NOT NULL DEFAULT 0,
  "category_id" INTEGER NOT NULL,
  "sku" VARCHAR(50) UNIQUE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "total_amount" DECIMAL(10,2) NOT NULL,
  "shipping_address" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" SERIAL PRIMARY KEY,
  "order_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Foreign keys
ALTER TABLE "categories"
  ADD CONSTRAINT "fk_categories_parent"
  FOREIGN KEY ("parent_id")
  REFERENCES "categories"("id")
  ON DELETE SET NULL;

ALTER TABLE "products"
  ADD CONSTRAINT "fk_products_category"
  FOREIGN KEY ("category_id")
  REFERENCES "categories"("id")
  ON DELETE RESTRICT;

ALTER TABLE "orders"
  ADD CONSTRAINT "fk_orders_user"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE;

ALTER TABLE "order_items"
  ADD CONSTRAINT "fk_order_items_order"
  FOREIGN KEY ("order_id")
  REFERENCES "orders"("id")
  ON DELETE CASCADE;

ALTER TABLE "order_items"
  ADD CONSTRAINT "fk_order_items_product"
  FOREIGN KEY ("product_id")
  REFERENCES "products"("id")
  ON DELETE RESTRICT;

ALTER TABLE "reviews"
  ADD CONSTRAINT "fk_reviews_user"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "fk_reviews_product"
  FOREIGN KEY ("product_id")
  REFERENCES "products"("id")
  ON DELETE CASCADE;
