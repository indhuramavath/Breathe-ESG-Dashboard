import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, emissionRecordsTable } from "@workspace/db";
import {
  UpdateRecordStatusParams,
  UpdateRecordStatusBody,
  ListCompanyRecordsParams,
  ListCompanyRecordsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/companies/:id/records", async (req, res): Promise<void> => {
  const params = ListCompanyRecordsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListCompanyRecordsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(emissionRecordsTable.companyId, params.data.id)];

  if (query.data.status) {
    conditions.push(eq(emissionRecordsTable.status, query.data.status));
  }
  if (query.data.sourceType) {
    conditions.push(eq(emissionRecordsTable.sourceType, query.data.sourceType));
  }
  if (query.data.scope != null) {
    conditions.push(eq(emissionRecordsTable.scope, query.data.scope));
  }

  const records = await db
    .select()
    .from(emissionRecordsTable)
    .where(and(...conditions))
    .orderBy(emissionRecordsTable.importedAt);

  res.json(
    records.map((r) => ({
      ...r,
      rawData: r.rawData ?? {},
      notes: r.notes ?? null,
      approvedBy: r.approvedBy ?? null,
      approvedAt: r.approvedAt ?? null,
      uploadId: r.uploadId ?? null,
    }))
  );
});

router.patch("/records/:id/status", async (req, res): Promise<void> => {
  const params = UpdateRecordStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRecordStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
  };

  if (parsed.data.notes != null) updateData.notes = parsed.data.notes;
  if (parsed.data.approvedBy != null) updateData.approvedBy = parsed.data.approvedBy;

  if (parsed.data.status === "approved") {
    updateData.approvedAt = new Date();
    if (parsed.data.approvedBy) updateData.approvedBy = parsed.data.approvedBy;
  }

  const [record] = await db
    .update(emissionRecordsTable)
    .set(updateData as Parameters<typeof db.update>[0] extends infer T ? T : never)
    .where(eq(emissionRecordsTable.id, params.data.id))
    .returning();

  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  res.json({
    ...record,
    rawData: record.rawData ?? {},
    notes: record.notes ?? null,
    approvedBy: record.approvedBy ?? null,
    approvedAt: record.approvedAt ?? null,
    uploadId: record.uploadId ?? null,
  });
});

export default router;
