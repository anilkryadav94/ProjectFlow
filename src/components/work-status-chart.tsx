
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { type Project, clientNames, workflowStatuses } from "@/lib/data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { ChartTooltipContent } from "./ui/chart";

interface WorkStatusChartProps {
    projects: Project[];
}

const statusColors: { [key: string]: string } = {
  'Pending Allocation': '#6b7280', // gray-500
  'With Processor': '#3b82f6', // blue-500
  'With QA': '#8b5cf6', // violet-500
  'Completed': '#22c55e', // green-500
};

export function WorkStatusChart({ projects }: WorkStatusChartProps) {
    const chartData = React.useMemo(() => {
        const clientData: Record<string, Record<string, number>> = {};

        clientNames.forEach(client => {
            clientData[client] = { name: client };
            workflowStatuses.forEach(status => {
                clientData[client][status] = 0;
            });
        });

        projects.forEach(project => {
            if (clientData[project.client_name]) {
                if (clientData[project.client_name][project.workflowStatus] !== undefined) {
                    clientData[project.client_name][project.workflowStatus]++;
                }
            }
        });
        
        return Object.values(clientData);

    }, [projects]);
    
    const chartConfig = workflowStatuses.reduce((acc, status) => {
        acc[status] = { label: status, color: statusColors[status] };
        return acc;
    }, {} as any);


    return (
        <Card className="border-0 shadow-none">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      content={<ChartTooltipContent />}
                    />
                    <Legend />
                    {workflowStatuses.map((status) => (
                        <Bar 
                          key={status} 
                          dataKey={status} 
                          stackId="a" 
                          fill={statusColors[status]} 
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </Card>
    );
}

    