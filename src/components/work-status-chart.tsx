
"use client";

import * as React from "react";
import { getAllProjects } from "@/services/project-service";
import type { Project } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

interface ClientStats {
  pending: number;
  processed: number;
  onHold: number;
  rework: number;
  withQA: number;
  clientQuery: number;
  total: number;
}

interface UserStats {
  [key: string]: number;
}

interface Stats {
  clients: Record<string, ClientStats>;
  processors: UserStats;
  qas: UserStats;
  clientQueryTotal: number;
}

export function WorkStatusChart() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAndProcessData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const projects = await getAllProjects();
        const newStats: Stats = {
          clients: {},
          processors: {},
          qas: {},
          clientQueryTotal: 0,
        };

        projects.forEach((p: Project) => {
          // Initialize client if not present
          if (p.client_name && !newStats.clients[p.client_name]) {
            newStats.clients[p.client_name] = {
              pending: 0, processed: 0, onHold: 0, rework: 0, withQA: 0, clientQuery: 0, total: 0
            };
          }

          // Increment client stats
          if (p.client_name) {
            const client = newStats.clients[p.client_name];
            client.total++;
            if (p.processing_status === "Pending") client.pending++;
            if (p.processing_status === "Processed") client.processed++;
            if (p.processing_status === "On Hold") client.onHold++;
            if (p.processing_status === "Re-Work") client.rework++;
            if (p.workflowStatus === "With QA") client.withQA++;
            if (p.qa_status === "Client Query") client.clientQuery++;
          }
          
          // Increment processor stats
          if (p.processor) {
            newStats.processors[p.processor] = (newStats.processors[p.processor] || 0) + 1;
          }

          // Increment QA stats
          if (p.qa) {
            newStats.qas[p.qa] = (newStats.qas[p.qa] || 0) + 1;
          }
          
          // Increment total client query count
          if (p.qa_status === 'Client Query') {
            newStats.clientQueryTotal++;
          }
        });

        setStats(newStats);
      } catch (error) {
        console.error("Failed to fetch or process project stats:", error);
        setError("Failed to load work status data. This may be due to exceeding the data fetching quota.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndProcessData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
     return <p className="text-destructive text-sm p-4 text-center">{error}</p>;
  }

  if (!stats) {
    return <p className="text-muted-foreground">Could not load work status data.</p>;
  }
  
  const StatCard = ({ title, value }: { title: string, value: number}) => (
    <Card className="text-center">
        <CardHeader className="p-2 pb-0">
            <CardTitle className="text-2xl font-bold">{value}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
            <p className="text-xs text-muted-foreground font-semibold">{title}</p>
        </CardContent>
    </Card>
  )
  
  const sortedProcessors = Object.entries(stats.processors).sort(([, a], [, b]) => b - a);
  const sortedQAs = Object.entries(stats.qas).sort(([, a], [, b]) => b - a);


  return (
    <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Processors" value={Object.keys(stats.processors).length} />
            <StatCard title="Total QAs" value={Object.keys(stats.qas).length} />
            <StatCard title="Total Clients" value={Object.keys(stats.clients).length} />
            <StatCard title="Pending Client Queries" value={stats.clientQueryTotal} />
        </div>
    
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="col-span-3 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Processor Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <Table>
                <TableBody>
                  {sortedProcessors.map(([name, count]) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        
         <Card className="col-span-3 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">QA Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <Table>
                <TableBody>
                  {sortedQAs.map(([name, count]) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Client Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-center">Pending</TableHead>
                        <TableHead className="text-center">Processed</TableHead>
                        <TableHead className="text-center">Rework</TableHead>
                        <TableHead className="text-center">With QA</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats.clients).map(([name, data]) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{data.pending}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-green-500/20 border-green-500/30">{data.processed}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-red-500/20 border-red-500/30">{data.rework}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-purple-500/20 border-purple-500/30">{data.withQA}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    