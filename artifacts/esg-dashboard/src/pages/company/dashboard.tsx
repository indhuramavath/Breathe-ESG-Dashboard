import { useParams, Link } from "wouter";
import {
  useGetCompanyDashboard,
  getGetCompanyDashboardQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { 
  CloudRain, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle,
  ArrowRight,
  Database
} from "lucide-react";

const COLORS = {
  sap: "hsl(var(--chart-1))",
  utility: "hsl(var(--chart-2))",
  travel: "hsl(var(--chart-3))",
};

export default function Dashboard() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0", 10);

  const { data: summary, isLoading, error } = useGetCompanyDashboard(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCompanyDashboardQueryKey(id),
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-muted-foreground flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-destructive flex items-center gap-2 bg-destructive/10 p-4 rounded-md">
          Failed to load dashboard.
        </div>
      </div>
    );
  }

  if (!summary.hasData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <Database className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">No emissions data yet</h2>
        <p className="text-muted-foreground mb-8">
          This workspace is empty. Import SAP exports, utility bills, or travel records to begin analyzing your carbon footprint.
        </p>
        <Link href={`/companies/${id}/uploads`} className="w-full">
          <Button size="lg" className="w-full gap-2">
            Go to Uploads <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const scopeData = [
    { name: "Scope 1", value: summary.scope1Co2Kg, fill: "hsl(var(--chart-1))" },
    { name: "Scope 2", value: summary.scope2Co2Kg, fill: "hsl(var(--chart-2))" },
    { name: "Scope 3", value: summary.scope3Co2Kg, fill: "hsl(var(--chart-3))" },
  ];

  const sourceData = summary.bySource.map(s => ({
    name: s.sourceType.toUpperCase(),
    value: s.co2Kg,
    records: s.recordCount,
    fill: COLORS[s.sourceType as keyof typeof COLORS] || COLORS.sap
  }));

  const formatKg = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M kg`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k kg`;
    return `${val.toFixed(0)} kg`;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Carbon accounting summary and review progress.</p>
        </div>
        <div className="bg-card border rounded-lg px-4 py-2 flex items-center gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Emissions</span>
              <span className="text-lg font-bold text-foreground leading-none">{formatKg(summary.totalCo2Kg)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendingCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.approvedCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flagged</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.flaggedCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.rejectedCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Emissions by Scope</CardTitle>
            <CardDescription>Distribution of CO2 across operational scopes</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scopeData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))"}} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={formatKg}
                  tick={{fill: "hsl(var(--muted-foreground))"}} 
                />
                <Tooltip 
                  cursor={{fill: "hsl(var(--muted))", opacity: 0.4}}
                  contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))"}}
                  formatter={(val: number) => [formatKg(val), "CO2"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {scopeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Emissions by Source</CardTitle>
            <CardDescription>Contribution by data origin system</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))"}}
                  formatter={(val: number) => [formatKg(val), "CO2"]}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
