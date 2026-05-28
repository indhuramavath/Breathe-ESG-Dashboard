import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable, dataUploadsTable, emissionRecordsTable } from "@workspace/db";
import {
  ListCompanyUploadsParams,
  UploadDataParams,
  UploadDataBody,
} from "@workspace/api-zod";
import { parseSapCsv, parseUtilityCsv, parseTravelCsv } from "../lib/csvParsers.js";

const router: IRouter = Router();

router.get("/companies/:id/uploads", async (req, res): Promise<void> => {
  const params = ListCompanyUploadsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const uploads = await db
    .select()
    .from(dataUploadsTable)
    .where(eq(dataUploadsTable.companyId, params.data.id))
    .orderBy(dataUploadsTable.uploadedAt);

  res.json(
    uploads.map((u) => ({
      ...u,
      errorLog: u.errorLog ?? null,
    }))
  );
});

router.post("/companies/:id/uploads/:sourceType", async (req, res): Promise<void> => {
  const params = UploadDataParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UploadDataBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, params.data.id));

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  // Parse the CSV based on source type
  const { sourceType } = params.data;
  let parseResult;
  if (sourceType === "sap") {
    parseResult = parseSapCsv(body.data.csvData);
  } else if (sourceType === "utility") {
    parseResult = parseUtilityCsv(body.data.csvData);
  } else {
    parseResult = parseTravelCsv(body.data.csvData);
  }

  const { records, errors } = parseResult;

  // Create the upload record
  const [upload] = await db
    .insert(dataUploadsTable)
    .values({
      companyId: params.data.id,
      sourceType,
      filename: body.data.filename,
      status: errors.length > 0 && records.length === 0 ? "failed" : "completed",
      totalRows: records.length + errors.length,
      importedRows: records.length,
      errorRows: errors.length,
      errorLog: errors.length > 0 ? errors.join("\n") : null,
    })
    .returning();

  // Insert the parsed records
  if (records.length > 0) {
    await db.insert(emissionRecordsTable).values(
      records.map((r) => ({
        companyId: params.data.id,
        uploadId: upload.id,
        sourceType: r.sourceType,
        scope: r.scope,
        activityType: r.activityType,
        quantity: r.quantity,
        unit: r.unit,
        co2Kg: r.co2Kg,
        status: "pending" as const,
        rawData: r.rawData,
      }))
    );
  }

  res.status(201).json({
    upload: { ...upload, errorLog: upload.errorLog ?? null },
    importedRows: records.length,
    errorRows: errors.length,
    errors,
  });
});

export default router;
