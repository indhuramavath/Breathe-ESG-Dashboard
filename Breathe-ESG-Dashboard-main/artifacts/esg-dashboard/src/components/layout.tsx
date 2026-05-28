import { ReactNode } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { LayoutDashboard, ListTodo, UploadCloud, ChevronLeft, Building2 } from "lucide-react";
import { useGetCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const params = useParams<{ id: string }>();
  const companyId = parseInt(params.id || "0", 10);

  const { data: company, isLoading } = useGetCompany(companyId, {
    query: {
      enabled: !!companyId,
      queryKey: getGetCompanyQueryKey(companyId),
    },
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar variant="sidebar" collapsible="none" className="border-r border-sidebar-border w-64 flex-shrink-0">
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <Link href="/" className="flex items-center text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors mb-4">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Companies
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-sidebar-foreground truncate" data-testid="text-company-name">
                  {isLoading ? "Loading..." : company?.name || "Unknown Company"}
                </span>
                <span className="text-xs text-sidebar-foreground/50 truncate">
                  ESG Workspace
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === `/companies/${companyId}`}
                  tooltip="Dashboard"
                >
                  <Link href={`/companies/${companyId}`}>
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === `/companies/${companyId}/records`}
                  tooltip="Review Queue"
                >
                  <Link href={`/companies/${companyId}/records`}>
                    <ListTodo className="w-4 h-4" />
                    <span>Review Queue</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === `/companies/${companyId}/uploads`}
                  tooltip="Upload Data"
                >
                  <Link href={`/companies/${companyId}/uploads`}>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Data</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
