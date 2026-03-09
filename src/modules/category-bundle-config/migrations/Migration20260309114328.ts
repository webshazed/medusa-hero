import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260309114328 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "category_bundle_config" ("id" text not null, "category_id" text not null, "min_quantity" integer not null default 2, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "category_bundle_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_category_bundle_config_deleted_at" ON "category_bundle_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "category_bundle_config" cascade;`);
  }

}
