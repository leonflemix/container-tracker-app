// File: src/components/Dashboard.jsx
// Location: src/components

import React, { useMemo } from 'react';
import { CONTAINER_STATUSES } from '../constants';
import DashboardSection from './DashboardSection';
import { safeToDate } from '../utils/dates';

// A simple component for displaying a key metric
const StatCard = ({ title, value, icon }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4">
        <div className="text-3xl">{icon}</div>
        <div>
            <div className="text-gray-400 text-sm font-medium">{title}</div>
            <div className="text-3xl font-bold text-white">{value}</div>
        </div>
    </div>
);

// A simple bar chart component
const StatusChart = ({ data }) => {
    const maxValue = Math.max(...data.map(item => item.count), 0);
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="font-bold text-lg mb-4 text-white">Containers by Status</h3>
            <div className="space-y-3">
                {data.map(item => (
                    <div key={item.status} className="flex items-center">
                        <div className="w-48 text-sm text-gray-300 truncate pr-2">{item.emoji} {item.status}</div>
                        <div className="flex-grow bg-gray-700 rounded-full h-6 flex items-center">
                            <div
                                className="bg-blue-500 h-6 rounded-full text-xs text-white flex items-center justify-end pr-2"
                                style={{ width: `${(item.count / maxValue) * 100}%` }}
                            >
                                <span className="font-bold pl-2">{item.count}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function Dashboard({ containers = [], onOpen = () => {} }) {
    const active = containers.filter(c => !c.archivedAt);

    const actionsNeeded = active.filter(c => String(c.status).trim() === 'Loading Complete');
    const readyList = active.filter(c => String(c.status).trim() === 'ALL GOOD, BOOK FOR DELIVERY');
    const assignedList = active.filter(c => String(c.status || '').startsWith('Assigned to Driver'));

    const renderRow = (c) => (
        <div className="flex justify-between items-center gap-4 py-2 px-3 hover:bg-gray-700 rounded cursor-pointer" onClick={() => onOpen(c)}>
            <div className="font-semibold">{c.id}</div>
            <div className="text-sm text-gray-300">{c.booking || '—'}</div>
            <div className="text-sm text-gray-400">{c.truck || c.deliveryDriver || '—'}</div>
            <div className="text-xs text-gray-500">{safeToDate(c.lastUpdate)?.toLocaleString() || ''}</div>
        </div>
    );

    const stats = useMemo(() => {
        const totalContainers = containers.length;
        
        const statusCounts = containers.reduce((acc, container) => {
            acc[container.status] = (acc[container.status] || 0) + 1;
            return acc;
        }, {});

        const chartData = Object.entries(statusCounts)
            .map(([status, count]) => {
                const statusInfo = CONTAINER_STATUSES.find(s => s.label === status) || { emoji: '❓' };
                return { status, count, emoji: statusInfo.emoji };
            })
            .sort((a, b) => b.count - a.count);

        const attentionNeeded = containers.filter(c => {
            const statusInfo = CONTAINER_STATUSES.find(s => s.label === c.status);
            return statusInfo?.isDispatchOption;
        });

        return { totalContainers, chartData, attentionNeeded };
    }, [containers]);

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Containers in Yard" value={stats.totalContainers} icon="🏗️" />
                <StatCard title="Attention Needed" value={stats.attentionNeeded.length} icon="⚠️" />
                <StatCard title="Ready for Delivery" value={stats.chartData.find(s => s.status === 'ALL GOOD, BOOK FOR DELIVERY')?.count || 0} icon="👍🏻" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Chart */}
                <StatusChart data={stats.chartData} />

                {/* Attention Needed List */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                     <h3 className="font-bold text-lg mb-4 text-white">Attention Needed</h3>
                     <div className="space-y-3 max-h-96 overflow-y-auto">
                        {stats.attentionNeeded.length > 0 ? (
                            stats.attentionNeeded.map(container => (
                                <div 
                                    key={container.id} 
                                    onClick={() => onOpen(container)}
                                    className="bg-gray-700 p-3 rounded-md flex justify-between items-center cursor-pointer hover:bg-gray-600 transition-colors"
                                >
                                    <div>
                                        <p className="font-bold text-blue-400">{container.id}</p>
                                        <p className="text-sm text-gray-300">{container.status}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Updated:</p>
                                        <p className="text-xs text-gray-400">{safeToDate(container.lastUpdate)?.toLocaleString() || ''}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4">No containers currently need attention.</p>
                        )}
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <DashboardSection title="Actions Needed" subtitle="Containers after 'loaded' and before 'all good'" count={actionsNeeded.length}>
                    {actionsNeeded.length === 0 ? <div className="p-3 text-gray-400">No items</div> : actionsNeeded.map(renderRow)}
                </DashboardSection>

                <DashboardSection title="Ready list" subtitle="Containers ready to be assigned" count={readyList.length}>
                    {readyList.length === 0 ? <div className="p-3 text-gray-400">No items</div> : readyList.map(renderRow)}
                </DashboardSection>

                <DashboardSection title="Assigned list" subtitle="Containers assigned to a driver" count={assignedList.length}>
                    {assignedList.length === 0 ? <div className="p-3 text-gray-400">No items</div> : assignedList.map(renderRow)}
                </DashboardSection>
            </div>
        </div>
    );
}

