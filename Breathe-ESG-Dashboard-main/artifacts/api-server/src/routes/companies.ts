import { Router, type IRouter } from "express";
import { eq, sql, count } from "drizzle-orm";
import { db, companiesTable, emissionRecordsTable } from "@workspace/db";
import {
  CreateCompanyBody,
  UpdateCompanyParams,
  UpdateCompanyBody,
  DeleteCompanyParams,
  GetCompanyParams,
  GetCompanyDashboardParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/companies", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      isSample: companiesTable.isSample,
      createdAt: companiesTable.createdAt,
      recordCount: count(emissionRecordsTable.id),
    })
    .from(companiesTable)
    .leftJoin(emissionRecordsTable, eq(emissionRecordsTable.companyId, companiesTable.id))
    .groupBy(companiesTable.id)
    .orderBy(companiesTable.createdAt);

  res.json(rows.map((r) => ({ ...r, recordCount: Number(r.recordCount) })));
});

router.post("/companies", async (req, res): Promise<void> => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [company] = await db
    .insert(companiesTable)
    .values({ name: parsed.data.name, isSample: false })
    .returning();

  res.status(201).json({ ...company, recordCount: 0 });
});

router.get("/companies/:id", async (req, res): Promise<void> => {
  const params = GetCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      isSample: companiesTable.isSample,
      createdAt: companiesTable.createdAt,
      recordCount: count(emissionRecordsTable.id),
    })
    .from(companiesTable)
    .leftJoin(emissionRecordsTable, eq(emissionRecordsTable.companyId, companiesTable.id))
    .where(eq(companiesTable.id, params.data.id))
    .groupBy(companiesTable.id);

  if (!row) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.json({ ...row, recordCount: Number(row.recordCount) });
});

router.patch("/companies/:id", async (req, res): Promise<void> => {
  const params = UpdateCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [company] = await db
    .update(companiesTable)
    .set({ name: parsed.data.name })
    .where(eq(companiesTable.id, params.data.id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const [row] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      isSample: companiesTable.isSample,
      createdAt: companiesTable.createdAt,
      recordCount: count(emissionRecordsTable.id),
    })
    .from(companiesTable)
    .leftJoin(emissionRecordsTable, eq(emissionRecordsTable.companyId, companiesTable.id))
    .where(eq(companiesTable.id, params.data.id))
    .groupBy(companiesTable.id);

  res.json({ ...row, recordCount: Number(row?.recordCount ?? 0) });
});

router.delete("/companies/:id", async (req, res): Promise<void> => {
  const params = DeleteCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [company] = await db
    .delete(companiesTable)
    .where(eq(companiesTable.id, params.data.id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/companies/:id/dashboard", async (req, res): Promise<void> => {
  const params = GetCompanyDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  const records = await db
    .select()
    .from(emissionRecordsTable)
    .where(eq(emissionRecordsTable.companyId, params.data.id));

  if (records.length === 0) {
    res.json({
      totalCo2Kg: 0,
      scope1Co2Kg: 0,
      scope2Co2Kg: 0,
      scope3Co2Kg: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      flaggedCount: 0,
      hasData: false,
      bySource: [],
    });
    return;
  }

  let totalCo2Kg = 0, scope1Co2Kg = 0, scope2Co2Kg = 0, scope3Co2Kg = 0;
  let pendingCount = 0, approvedCount = 0, rejectedCount = 0, flaggedCount = 0;
  const bySourceMap: Record<string, { co2Kg: number; recordCount: number }> = {};

  for (const r of records) {
    const co2 = r.co2Kg ?? 0;
    totalCo2Kg += co2;
    if (r.scope === 1) scope1Co2Kg += co2;
    else if (r.scope === 2) scope2Co2Kg += co2;
    else scope3Co2Kg += co2;

    if (r.status === "pending") pendingCount++;
    else if (r.status === "approved") approvedCount++;
    else if (r.status === "rejected") rejectedCount++;
    else if (r.status === "flagged") flaggedCount++;

    const src = r.sourceType;
    if (!bySourceMap[src]) bySourceMap[src] = { co2Kg: 0, recordCount: 0 };
    bySourceMap[src].co2Kg += co2;
    bySourceMap[src].recordCount++;
  }

  const bySource = Object.entries(bySourceMap).map(([sourceType, v]) => ({
    sourceType,
    co2Kg: parseFloat(v.co2Kg.toFixed(3)),
    recordCount: v.recordCount,
  }));

  res.json({
    totalCo2Kg: parseFloat(totalCo2Kg.toFixed(3)),
    scope1Co2Kg: parseFloat(scope1Co2Kg.toFixed(3)),
    scope2Co2Kg: parseFloat(scope2Co2Kg.toFixed(3)),
    scope3Co2Kg: parseFloat(scope3Co2Kg.toFixed(3)),
    pendingCount,
    approvedCount,
    rejectedCount,
    flaggedCount,
    hasData: true,
    bySource,
  });
});

export default router;
