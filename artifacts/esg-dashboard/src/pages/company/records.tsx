import React, { useState } from "react";
import { useParams } from "wouter";
import {
  useListCompanyRecords,
  useUpdateRecordStatus,
  getListCompanyRecordsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "flagged";
type SourceFilter = "all" | "sap" | "utility" | "travel";

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    icon: <Clock className="w-3 h-3" />,
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  flagged: {
    label: "Flagged",
    className: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    icon: <XCircle className="w-3 h-3" />,
  },
};

const SOURCE_BADGE: Record<string, string> = {
  sap: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  utility: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  travel: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

function formatCo2(val: number) {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}t`;
  return `${val.toFixed(1)} kg`;
}

export default function Records() {
  const params = useParams<{ id: string }>();
  const companyId = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    recordId: number;
    action: "approved" | "rejected" | "flagged";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const updateStatus = useUpdateRecordStatus();

  const queryParams = {
    ...(statusFilter !== "all" ? { status: statusFilter as "pending" | "approved" | "rejected" | "flagged" } : {}),
    ...(sourceFilter !== "all" ? { sourceType: sourceFilter as "sap" | "utility" | "travel" } : {}),
  };

  const { data: records, isLoading, error } = useListCompanyRecords(
    companyId,
    queryParams,
    { query: { queryKey: getListCompanyRecordsQueryKey(companyId, queryParams) } }
  );

  const handleStatusChange = (recordId: number, action: "approved" | "rejected" | "flagged") => {
    if (action === "approved") {
      updateStatus.mutate(
        { id: recordId, data: { status: action, approvedBy: "Analyst" } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCompanyRecordsQueryKey(companyId) });
          },
        }
      );
    } else {
      setReviewNote("");
      setReviewDialog({ open: true, recordId, action });
    }
  };

  const submitReview = () => {
    if (!reviewDialog) return;
    updateStatus.mutate(
      {
        id: reviewDialog.recordId,
        data: { status: reviewDialog.action, notes: reviewNote, approvedBy: "Analyst" },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompanyRecordsQueryKey(companyId) });
          setReviewDialog(null);
          setReviewNote("");
        },
      }
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Review Queue</h1>
        <p className="text-muted-foreground mt-1">Review, approve, flag, or reject emission records.</p>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
          <SelectTrigger className="w-40" data-testid="select-source-filter">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="sap">SAP</SelectItem>
            <SelectItem value="utility">Utility</SelectItem>
            <SelectItem value="travel">Travel</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || sourceFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStatusFilter("all"); setSourceFilter("all"); }}
            className="text-muted-foreground"
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {records ? `${records.length} record${records.length !== 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading records...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">Failed to load records.</div>
          ) : !records?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              No records match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-6"></TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">CO2</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <React.Fragment key={record.id}>
                    <TableRow
                      data-testid={`row-record-${record.id}`}
                      className="border-border cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedRow(expandedRow === record.id ? null : record.id)}
                    >
                      <TableCell className="pl-4 pr-0">
                        {expandedRow === record.id
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium capitalize text-foreground">
                          {record.activityType.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${SOURCE_BADGE[record.sourceType] ?? ""}`}>
                          {record.sourceType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">Scope {record.scope}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {record.quantity.toLocaleString()} {record.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-foreground">
                        {formatCo2(record.co2Kg)}
                      </TableCell>
                      <TableCell>
                        {STATUS_BADGE[record.status] ? (
                          <Badge
                            variant="outline"
                            className={`gap-1 text-xs ${STATUS_BADGE[record.status].className}`}
                          >
                            {STATUS_BADGE[record.status].icon}
                            {STATUS_BADGE[record.status].label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">{record.status}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(record.importedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {record.status !== "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => handleStatusChange(record.id, "approved")}
                              disabled={updateStatus.isPending}
                              data-testid={`button-approve-${record.id}`}
                              title="Approve"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {record.status !== "flagged" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                              onClick={() => handleStatusChange(record.id, "flagged")}
                              disabled={updateStatus.isPending}
                              data-testid={`button-flag-${record.id}`}
                              title="Flag for review"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {record.status !== "rejected" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleStatusChange(record.id, "rejected")}
                              disabled={updateStatus.isPending}
                              data-testid={`button-reject-${record.id}`}
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedRow === record.id && (
                      <TableRow key={`${record.id}-expanded`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={9} className="px-8 pb-4 pt-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Raw Data</h4>
                              <pre className="text-xs font-mono bg-background border rounded p-3 overflow-auto max-h-40 text-foreground/80">
                                {JSON.stringify(record.rawData, null, 2)}
                              </pre>
                            </div>
                            <div className="space-y-2">
                              {record.notes && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</h4>
                                  <p className="text-sm text-foreground/80 bg-background border rounded p-2">{record.notes}</p>
                                </div>
                              )}
                              {record.approvedBy && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    {record.status === "approved" ? "Approved by" : "Reviewed by"}
                                  </h4>
                                  <p className="text-sm text-foreground/80">{record.approvedBy}
                                    {record.approvedAt && ` · ${new Date(record.approvedAt).toLocaleString()}`}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewDialog?.open} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "rejected" ? "Reject Record" : "Flag Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {reviewDialog?.action === "rejected"
                ? "Optionally add a note explaining why this record was rejected."
                : "Optionally describe why this record needs further review."}
            </p>
            <Textarea
              placeholder="Add a note (optional)..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              data-testid="input-review-note"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              onClick={submitReview}
              disabled={updateStatus.isPending}
              variant={reviewDialog?.action === "rejected" ? "destructive" : "default"}
              className={reviewDialog?.action === "flagged" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
            >
              {reviewDialog?.action === "rejected" ? "Reject" : "Flag"} Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
