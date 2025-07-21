
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy, processors, qas, projectStatuses, clientNames, processes } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProjectForm } from './project-form';
import { Button } from './ui/button';
import { bulkUpdateProjects } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Loader2 } from 'lucide-react';
import { AdvancedSearchForm, type SearchCriteria } from './advanced-search-form';

interface DashboardProps {
  user: User;
  initialProjects: Project[];
}

export type SearchableColumn = 'refNumber' | 'applicationNumber' | 'patentNumber' | 'subject';

const bulkUpdateFields = [
    { value: 'processor', label: 'Processor', options: processors },
    { value: 'qa', label: 'QA', options: qas },
    { value: 'status', label: 'Status', options: projectStatuses },
] as const;

export default function Dashboard({ 
  user, 
  initialProjects,
}: DashboardProps) {
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>('refNumber');
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const [isNewProjectFormOpen, setIsNewProjectFormOpen] = React.useState(false);
  
  // State for bulk updates
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [bulkUpdateField, setBulkUpdateField] = React.useState<(typeof bulkUpdateFields)[number]['value']>('processor');
  const [bulkUpdateValue, setBulkUpdateValue] = React.useState('');
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);

  // Advanced Search State
  const [searchCriteria, setSearchCriteria] = React.useState<SearchCriteria | null>(null);
  const [showSearchForm, setShowSearchForm] = React.useState(true);
  const [filteredProjects, setFilteredProjects] = React.useState<Project[] | null>(null);

  const { toast } = useToast();

  React.useEffect(() => {
    if (user?.roles?.length > 0) {
      const highestRole = roleHierarchy.find(role => user.roles.includes(role));
      setActiveRole(highestRole || user.roles[0]);
    }
  }, [user.roles]);

  const handleProjectUpdate = (updatedProject: Project) => {
    const updater = (prev: Project[]) => prev.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(updater);
    if(filteredProjects) {
      setFilteredProjects(updater);
    }
  };
  
  const handleDownload = () => {
    const dataToExport = filteredProjects ?? dashboardProjects;
    if (dataToExport.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `projects_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpdate = async () => {
    const projectIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    if (projectIds.length === 0 || !bulkUpdateField || !bulkUpdateValue) {
        toast({ title: "Bulk Update Error", description: "Please select rows, a field, and a value.", variant: "destructive" });
        return;
    }
    
    setIsBulkUpdating(true);
    try {
        const result = await bulkUpdateProjects({ projectIds, field: bulkUpdateField, value: bulkUpdateValue });
        if (result.success) {
            setProjects(prevProjects => {
                const updated = new Map(result.updatedProjects.map(p => [p.id, p]));
                return prevProjects.map(p => updated.get(p.id) || p);
            });
            if (filteredProjects) {
                 setFilteredProjects(prevProjects => {
                    if (!prevProjects) return null;
                    const updated = new Map(result.updatedProjects.map(p => [p.id, p]));
                    return prevProjects.map(p => updated.get(p.id) || p);
                });
            }
            toast({ title: "Success", description: `${result.updatedProjects.length} projects have been updated.` });
            setRowSelection({});
            setBulkUpdateValue('');
        }
    } catch (error) {
        toast({ title: "Bulk Update Failed", description: "An error occurred.", variant: "destructive" });
    } finally {
        setIsBulkUpdating(false);
    }
  };

  const handleSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    setShowSearchForm(false);

    let results = [...projects];
    
    // Role-based pre-filtering
    if (activeRole === 'Processor') {
      results = results.filter(p => p.processor === user.name);
    } else if (activeRole === 'QA') {
      results = results.filter(p => p.qa === user.name);
    }

    results = results.filter(project => {
      return criteria.every(criterion => {
        if (!criterion.field || !criterion.operator || (criterion.operator !== 'blank' && !criterion.value)) return true;
        const fieldValue = project[criterion.field as keyof Project] as string | null | undefined;

        switch (criterion.operator) {
            case 'blank':
                return !fieldValue;
            case 'equals':
                return fieldValue?.toLowerCase() === criterion.value.toLowerCase();
            case 'in':
                const values = criterion.value.split(',').map(v => v.trim().toLowerCase());
                return fieldValue ? values.includes(fieldValue.toLowerCase()) : false;
            case 'startsWith':
                return fieldValue?.toLowerCase().startsWith(criterion.value.toLowerCase()) ?? false;
            case 'contains':
                return fieldValue?.toLowerCase().includes(criterion.value.toLowerCase()) ?? false;
            case 'dateEquals':
                 if (!fieldValue) return false;
                 return new Date(fieldValue).toDateString() === new Date(criterion.value).toDateString();
            default:
                return true;
        }
      });
    });
    setFilteredProjects(results);
  };
  
  const handleResetSearch = () => {
      setSearchCriteria(null);
      setFilteredProjects(null);
      setShowSearchForm(true);
  }

  const handleAmendSearch = () => {
      setShowSearchForm(true);
  }


  const dashboardProjects = React.useMemo(() => {
    let baseProjects = filteredProjects ?? (activeRole === 'Manager' || activeRole === 'Admin' ? projects : []);

    let filtered = [...baseProjects];

    if (activeRole === 'Processor') {
      filtered = projects.filter(p => p.processor === user.name);
    } else if (activeRole === 'QA') {
      filtered = projects.filter(p => p.qa === user.name);
    }
    
    if (search && searchColumn && (activeRole === 'Processor' || activeRole === 'QA')) {
        filtered = filtered.filter(project => {
            const projectValue = project[searchColumn];
            if (typeof projectValue === 'string') {
                return projectValue.toLowerCase().includes(search.toLowerCase());
            }
            return false;
        });
    }
    
    if (sort) {
      filtered.sort((a, b) => {
        const valA = a[sort.key];
        const valB = b[sort.key];
        if (valA === null) return 1; if (valB === null) return -1;
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [search, searchColumn, activeRole, user.name, projects, sort, filteredProjects]);


  if (!activeRole) {
    return null;
  }
  
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
  const showQuickSearch = activeRole === 'Processor' || activeRole === 'QA';
  const columns = getColumns(isManagerOrAdmin, rowSelection, setRowSelection, dashboardProjects);
  const selectedBulkUpdateField = bulkUpdateFields.find(f => f.value === bulkUpdateField);

  return (
     <div className="flex flex-col h-screen bg-background w-full">
        <Header 
            user={user}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            search={search}
            setSearch={setSearch}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
            handleDownload={handleDownload}
            isDownloadDisabled={(filteredProjects ?? dashboardProjects).length === 0}
            showQuickSearch={showQuickSearch}
            isManagerOrAdmin={isManagerOrAdmin}
            hasSearchResults={filteredProjects !== null}
            onAmendSearch={handleAmendSearch}
            onResetSearch={handleResetSearch}
        />
        <div className="flex flex-col flex-grow overflow-hidden p-4 gap-4">
            {activeRole === 'Admin' ? (
                <UserManagementTable sessionUser={user} />
            ) : isManagerOrAdmin ? (
              <>
                {showSearchForm && <AdvancedSearchForm onSearch={handleSearch} initialCriteria={searchCriteria} />}
                {filteredProjects !== null && (
                   <DataTable 
                        data={filteredProjects}
                        columns={columns}
                        sort={sort}
                        setSort={setSort}
                        rowSelection={rowSelection}
                        setRowSelection={setRowSelection}
                        isManagerOrAdmin={isManagerOrAdmin}
                    >
                         {Object.keys(rowSelection).length > 0 && (
                            <div className="flex items-center gap-4 p-4 border-t bg-muted/50">
                                <span className="text-sm font-semibold">{Object.keys(rowSelection).length} selected</span>
                                <div className="flex items-center gap-2">
                                    <Select value={bulkUpdateField} onValueChange={(v) => {
                                        setBulkUpdateField(v as typeof bulkUpdateField);
                                        setBulkUpdateValue('');
                                    }}>
                                        <SelectTrigger className="w-[180px] h-9">
                                            <SelectValue placeholder="Select field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bulkUpdateFields.map(f => (
                                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    
                                    <Select value={bulkUpdateValue} onValueChange={setBulkUpdateValue}>
                                        <SelectTrigger className="w-[180px] h-9">
                                            <SelectValue placeholder="Select new value" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedBulkUpdateField?.options.map(opt => (
                                                 <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button size="sm" onClick={handleBulkUpdate} disabled={isBulkUpdating}>
                                     {isBulkUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Apply Update
                                </Button>
                            </div>
                        )}
                    </DataTable>
                )}
              </>
            ) : (
                <DataTable 
                    data={dashboardProjects}
                    columns={columns}
                    sort={sort}
                    setSort={setSort}
                    rowSelection={{}}
                    setRowSelection={() => {}}
                    isManagerOrAdmin={false}
                />
            )}
        </div>
        <Dialog open={isNewProjectFormOpen} onOpenChange={setIsNewProjectFormOpen}>
            <DialogContent className="sm:max-w-[75vw] h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ProjectForm 
                        onFormSubmit={handleProjectUpdate} 
                        setOpen={setIsNewProjectFormOpen}
                        role={activeRole}
                    />
                </div>
            </DialogContent>
      </Dialog>
    </div>
  );
}
