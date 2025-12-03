ALTER TABLE "qr_codes" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "options" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;