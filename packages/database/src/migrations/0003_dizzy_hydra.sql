ALTER TYPE "public"."email_type" ADD VALUE 'trial_started';--> statement-breakpoint
ALTER TYPE "public"."email_type" ADD VALUE 'trial_ending_7d';--> statement-breakpoint
ALTER TYPE "public"."email_type" ADD VALUE 'trial_ending_3d';--> statement-breakpoint
ALTER TYPE "public"."email_type" ADD VALUE 'trial_ending_1d';--> statement-breakpoint
ALTER TYPE "public"."email_type" ADD VALUE 'trial_expired';--> statement-breakpoint
ALTER TYPE "public"."email_type" ADD VALUE 'inactivity_7d';--> statement-breakpoint
ALTER TYPE "public"."email_type" ADD VALUE 'inactivity_14d';--> statement-breakpoint
ALTER TYPE "public"."email_type" ADD VALUE 'referral_signup';--> statement-breakpoint
ALTER TYPE "public"."email_type" ADD VALUE 'referral_reward';--> statement-breakpoint
CREATE TABLE "credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"referral_redemption_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"referred_organization_id" uuid NOT NULL,
	"referrer_credit_applied" boolean DEFAULT false NOT NULL,
	"referrer_credit_applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "trial_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "trial_extended_by" uuid;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "opening_hours" jsonb;--> statement-breakpoint
ALTER TABLE "menu_views" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "menu_views" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "menu_views" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_referral_redemption_id_referral_redemptions_id_fk" FOREIGN KEY ("referral_redemption_id") REFERENCES "public"."referral_redemptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_referred_organization_id_organizations_id_fk" FOREIGN KEY ("referred_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credits_org_idx" ON "credits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "credits_org_created_idx" ON "credits" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "referral_codes_org_idx" ON "referral_codes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "referral_redemptions_code_idx" ON "referral_redemptions" USING btree ("referral_code_id");--> statement-breakpoint
CREATE INDEX "referral_redemptions_referred_org_idx" ON "referral_redemptions" USING btree ("referred_organization_id");