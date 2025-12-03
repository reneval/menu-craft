CREATE INDEX "venues_org_name_idx" ON "venues" USING btree ("organization_id","name") WHERE "venues"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "menus_org_venue_sort_idx" ON "menus" USING btree ("organization_id","venue_id","sort_order") WHERE "menus"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "menus_org_status_idx" ON "menus" USING btree ("organization_id","status") WHERE "menus"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "menu_sections_org_menu_sort_idx" ON "menu_sections" USING btree ("organization_id","menu_id","sort_order");--> statement-breakpoint
CREATE INDEX "menu_sections_org_visible_idx" ON "menu_sections" USING btree ("organization_id","is_visible");--> statement-breakpoint
CREATE INDEX "menu_items_org_section_sort_idx" ON "menu_items" USING btree ("organization_id","section_id","sort_order");--> statement-breakpoint
CREATE INDEX "menu_items_org_available_idx" ON "menu_items" USING btree ("organization_id","is_available");--> statement-breakpoint
CREATE INDEX "menu_items_org_price_idx" ON "menu_items" USING btree ("organization_id","price_type","price_amount");--> statement-breakpoint
CREATE INDEX "menu_item_options_org_item_group_idx" ON "menu_item_options" USING btree ("organization_id","menu_item_id","option_group");--> statement-breakpoint
CREATE INDEX "menu_item_options_org_sort_idx" ON "menu_item_options" USING btree ("organization_id","sort_order");--> statement-breakpoint
CREATE INDEX "menu_schedules_org_menu_priority_idx" ON "menu_schedules" USING btree ("organization_id","menu_id","priority","is_active");--> statement-breakpoint
CREATE INDEX "menu_schedules_org_active_type_idx" ON "menu_schedules" USING btree ("organization_id","is_active","schedule_type");--> statement-breakpoint
CREATE INDEX "translations_org_entity_lang_idx" ON "translations" USING btree ("organization_id","entity_type","entity_id","language_code");--> statement-breakpoint
CREATE INDEX "translations_org_auto_idx" ON "translations" USING btree ("organization_id","is_auto_translated");