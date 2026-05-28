import { pgTable, text, serial, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { dataUploadsTable } from "./dataUploads";

export const emissionRecordsTable = pgTable("emission_records", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  uploadId: integer("upload_id").references(() => dataUploadsTable.id, { onDelete: "set null" }),
  sourceType: text("source_type").notNull(), // sap | utility | travel
  scope: integer("scope").notNull(), // 1 | 2 | 3
  activityType: text("activity_type").notNull(), // e.g. "diesel", "electricity", "flight"
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(), // e.g. "L", "kWh", "km"
  co2Kg: real("co2_kg").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | flagged
  notes: text("notes"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rawData: jsonb("raw_data").notNull().default({}),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmissionRecordSchema = createInsertSchema(emissionRecordsTable).omit({ id: true, importedAt: true });
export type InsertEmissionRecord = z.infer<typeof insertEmissionRecordSchema>;
export type EmissionRecord = typeof emissionRecordsTable.$inferSelect;
