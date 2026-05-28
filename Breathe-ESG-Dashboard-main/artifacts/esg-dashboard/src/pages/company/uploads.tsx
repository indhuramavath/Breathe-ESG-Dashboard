import { useState } from "react";
import { useParams } from "wouter";
import {
  useListCompanyUploads,
  useUploadData,
  getListCompanyUploadsQueryKey,
  getListCompanyRecordsQueryKey,
  getGetCompanyDashboardQueryKey,
  getGetCompanyQueryKey,
  getListCompaniesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadCloud, CheckCircle2, XCircle, Clock, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SourceType = "sap" | "utility" | "travel";

const SOURCE_CONFIG: Record<SourceType, {
  label: string;
  description: string;
  sampleHeaders: string;
  hint: string;
  color: string;
}> = {
  sap: {
    label: "SAP Export",
    description: "Fuel and procurement data from SAP flat-file export",
    sampleHeaders: "date,plant_code,activity_type,quantity,unit",
    hint: "Supports: diesel, petrol, natural_gas, lpg. Handles German column names (Menge, Einheit, Datum, Werk).",
    color: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  },
  utility: {
    label: "Utility Data",
    description: "Electricity consumption from portal CSV export",
    sampleHeaders: "billing_period,meter_id,consumption_kwh,tariff,supplier",
    hint: "Supports: kWh, units. Handles MPAN meter IDs, billing periods, and half-hourly (HH) data.",
    color: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  },
  travel: {
    label: "Corporate Travel",
    description: "Flights, hotels, and ground transport from Concur/Navan export",
    sampleHeaders: "date,expense_type,distance_km,unit,origin,destination",
    hint: "Supports: flight, hotel, taxi, train, car_rental. Distances in km, hotel stays in nights.",
    color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
  },
};

function UploadPanel({ companyId, sourceType }: { companyId: number; sourceType: SourceType }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filename, setFilename] = useState("");
  const [csvData, setCsvData] = useState("");
  const [showSample, setShowSample] = useState(false);

  const uploadData = useUploadData();
  const config = SOURCE_CONFIG[sourceType];

  const handleUpload = () => {
    if (!csvData.trim()) {
      toast({ title: "No data", description: "Paste CSV data before uploading.", variant: "destructive" });
      return;
    }

    const effectiveFilename = filename.trim() || `${sourceType}_${new Date().toISOString().slice(0, 10)}.csv`;

    uploadData.mutate(
      {
        id: companyId,
        sourceType,
        data: { filename: effectiveFilename, csvData },
      },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListCompanyUploadsQueryKey(companyId) });
          queryClient.invalidateQueries({ queryKey: getListCompanyRecordsQueryKey(companyId) });
          queryClient.invalidateQueries({ queryKey: getGetCompanyDashboardQueryKey(companyId) });
          queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey(companyId) });
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });

          if (result.importedRows > 0) {
            toast({
              title: "Upload complete",
              description: `Imported ${result.importedRows} record${result.importedRows !== 1 ? "s" : ""}${result.errorRows > 0 ? `, ${result.errorRows} errors` : ""}.`,
            });
            setCsvData("");
            setFilename("");
          } else {
            toast({
              title: "Upload failed",
              description: result.errors[0] || "Could not parse any records from the CSV.",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({ title: "Upload failed", description: "Server error. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs font-semibold ${config.color}`}>
                {sourceType.toUpperCase()}
              </Badge>
              {config.label}
            </CardTitle>
            <CardDescription className="mt-1">{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">{config.hint}</p>
          <button
            type="button"
            className="text-xs text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline"
            onClick={() => setShowSample(!showSample)}
          >
            {showSample ? "Hide" : "Show"} expected format
          </button>
          {showSample && (
            <pre className="mt-2 text-xs font-mono bg-muted/50 border rounded p-2 text-muted-foreground">
              {config.sampleHeaders}{"\n"}
              {"<data rows...>"}
            </pre>
          )}
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Filename (optional)"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            data-testid={`input-filename-${sourceType}`}
          />
          <Textarea
            placeholder={`Paste ${config.label} CSV data here...`}
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            rows={6}
            className="font-mono text-sm resize-y"
            data-testid={`input-csv-${sourceType}`}
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={!csvData.trim() || uploadData.isPending}
          className="w-full gap-2"
          data-testid={`button-upload-${sourceType}`}
        >
          <UploadCloud className="w-4 h-4" />
          {uploadData.isPending ? "Importing..." : `Import ${config.label}`}
        </Button>
      </CardContent>
    </Card>
  );
}

function UploadHistory({ companyId }: { companyId: number }) {
  const { data: uploads, isLoading } = useListCompanyUploads(companyId, {
    query: { queryKey: getListCompanyUploadsQueryKey(companyId) },
  });

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-4 text-center">Loading history...</div>;
  }

  if (!uploads?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No uploads yet. Import data using the panels above.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead>File</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Imported</TableHead>
          <TableHead className="text-right">Errors</TableHead>
          <TableHead>Uploaded</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...uploads].reverse().map((upload) => (
          <TableRow key={upload.id} data-testid={`row-upload-${upload.id}`} className="border-border">
            <TableCell className="font-medium text-sm">{upload.filename}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={`text-xs capitalize ${
                  upload.sourceType === "sap"
                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    : upload.sourceType === "utility"
                    ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                    : "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                }`}
              >
                {upload.sourceType.toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                {statusIcon(upload.status)}
                <span className="capitalize text-sm">{upload.status}</span>
              </div>
            </TableCell>
            <TableCell className="text-right text-sm font-mono text-emerald-500">
              +{upload.importedRows}
            </TableCell>
            <TableCell className="text-right text-sm font-mono">
              {upload.errorRows > 0 ? (
                <span className="text-destructive">{upload.errorRows}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(upload.uploadedAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Uploads() {
  const params = useParams<{ id: string }>();
  const companyId = parseInt(params.id || "0", 10);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Upload Data</h1>
        <p className="text-muted-foreground mt-1">
          Import emissions data from SAP, utility portals, and travel platforms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UploadPanel companyId={companyId} sourceType="sap" />
        <UploadPanel companyId={companyId} sourceType="utility" />
        <UploadPanel companyId={companyId} sourceType="travel" />
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Upload History</h2>
        <Card>
          <CardContent className="p-0">
            <UploadHistory companyId={companyId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
