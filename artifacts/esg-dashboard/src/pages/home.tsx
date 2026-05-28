import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  useListCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  getListCompaniesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MoreVertical, Edit2, Trash2, Database, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const queryClient = useQueryClient();
  const { data: companies, isLoading, error } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() },
  });

  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = () => {
    if (!newCompanyName.trim()) return;
    createCompany.mutate(
      { data: { name: newCompanyName.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          setIsCreateOpen(false);
          setNewCompanyName("");
        },
      }
    );
  };

  const handleEditSubmit = () => {
    if (!editingId || !editName.trim()) return;
    updateCompany.mutate(
      { id: editingId, data: { name: editName.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          setEditingId(null);
        },
      }
    );
  };

  const handleDeleteSubmit = () => {
    if (!deletingId) return;
    deleteCompany.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          setDeletingId(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Loading workspace...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-destructive flex items-center gap-2 bg-destructive/10 p-4 rounded-md">
          <AlertCircle className="w-5 h-5" />
          Failed to load companies.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            Breathe ESG
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Select Company</h1>
            <p className="text-muted-foreground mt-1">Choose a workspace to review ESG data</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Company
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies?.map((company) => (
            <Card key={company.id} className="group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
              <CardContent className="p-0">
                <Link href={`/companies/${company.id}`} className="block p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {company.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Database className="w-3.5 h-3.5" />
                        {company.recordCount.toLocaleString()} records
                      </div>
                    </div>
                    {company.isSample && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                        Sample Data
                      </Badge>
                    )}
                  </div>
                </Link>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm border shadow-sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(company.id);
                          setEditName(company.name);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(company.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!companies || companies.length === 0) && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-card/50">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No companies yet</h3>
              <p className="text-muted-foreground mb-4">Create your first company workspace to begin.</p>
              <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Create Company
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Company</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter company name..."
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newCompanyName.trim() || createCompany.isPending}>
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Company</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Company name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEditSubmit()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={!editName.trim() || updateCompany.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the company
              and all of its associated ESG data and emission records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubmit} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
