import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const dataUploadsTable = pgTable("data_uploads", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(), // sap | utility | travel
  filename: text("filename").notNull(),
  status: text("status").notNull().default("processing"), // processing | completed | failed
  totalRows: integer("total_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  errorRows: integer("error_rows").notNull().default(0),
  errorLog: text("error_log"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDataUploadSchema = createInsertSchema(dataUploadsTable).omit({ id: true, uploadedAt: true });
export type InsertDataUpload = z.infer<typeof insertDataUploadSchema>;
export type DataUpload = typeof dataUploadsTable.$inferSelect;
