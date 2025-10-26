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

// Reusable container row component
const ContainerRow = ({ container, onOpen }) => {
    const lastUpdate = safeToDate(container.lastUpdate);
    const timeSince = lastUpdate ? new Intl.RelativeTimeFormat('en').format(
        Math.round((lastUpdate - new Date()) / (1000 * 60 * 60 * 24)),
        'days'
    ) : 'never';

    return (
        <div className="flex justify-between items-center gap-4 py-3 px-4 hover:bg-gray-700 rounded group">
            <div className="flex-1">
                <div className="font-semibold text-blue-400">{container.id}</div>
                <div className="text-sm text-gray-400">Booking: {container.booking || '—'}</div>
            </div>
            <div className="flex-1">
                <div className="text-sm text-gray-300">{container.status}</div>
                <div className="text-xs text-gray-500">{container.truck || container.deliveryDriver || '—'}</div>
            </div>
            <div className="text-right">
                <div className="text-xs text-gray-400">Last Update:</div>
                <div className="text-xs text-gray-500" title={lastUpdate?.toLocaleString()}>
                    {timeSince}
                </div>
            </div>
            <button 
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                onClick={() => onOpen(container)}
            >
                Update
            </button>
        </div>
    );
};

export default function Dashboard({ containers = [], onOpen = () => {} }) {
    const active = containers.filter(c => !c.archivedAt);

    const actionsNeeded = active.filter(c => String(c.status).trim() === 'Loading Complete');
    const readyList = active.filter(c => String(c.status).trim() === 'ALL GOOD, BOOK FOR DELIVERY');
    const assignedList = active.filter(c => String(c.status || '').startsWith('Assigned to Driver'));
    const needsRepair = active.filter(c => c.hasHolesBeforeSquish || c.hasHolesAfterSquish);
    const inWorkshop = active.filter(c => String(c.status).trim() === 'IN WORKSHOP');

    const renderRow = (c) => (
        <div className="flex justify-between items-center gap-4 py-2 px-3 hover:bg-gray-700 rounded cursor-pointer" onClick={() => onOpen(c)}>
            <div className="font-semibold">{c.id}</div>
            <div className="text-sm text-gray-300">{c.booking || '—'}</div>
            <div className="text-sm text-gray-400">{c.truck || c.deliveryDriver || '—'}</div>
           
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

    // Sort by most recent update first
    const sortByLastUpdate = (a, b) => {
        const dateA = safeToDate(a.lastUpdate)?.getTime() || 0;
        const dateB = safeToDate(b.lastUpdate)?.getTime() || 0;
        return dateB - dateA;
    };

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
                    {actionsNeeded.length === 0 ? <div className="p-3 text-gray-400">No items</div> : actionsNeeded.sort(sortByLastUpdate).map(container => (
                        <ContainerRow 
                            key={container.id} 
                            container={container} 
                            onOpen={onOpen} 
                        />
                    ))}
                </DashboardSection>

                <DashboardSection title="Needs Repair" subtitle="Containers with holes before or after squish" count={needsRepair.length} className="bg-red-900/20">
                    {needsRepair.length === 0 ? <div className="p-3 text-gray-400">No containers need repair</div> : needsRepair.sort(sortByLastUpdate).map(container => (
                        <ContainerRow 
                            key={container.id} 
                            container={container} 
                            onOpen={onOpen} 
                        />
                    ))}
                </DashboardSection>

                <DashboardSection title="In Workshop" subtitle="Containers currently being repaired" count={inWorkshop.length} className="bg-yellow-900/20">
                    {inWorkshop.length === 0 ? <div className="p-3 text-gray-400">No containers in workshop</div> : inWorkshop.sort(sortByLastUpdate).map(container => (
                        <ContainerRow 
                            key={container.id} 
                            container={container} 
                            onOpen={onOpen} 
                        />
                    ))}
                </DashboardSection>

                <DashboardSection title="Ready for Assignment" subtitle="Containers ready to be assigned to drivers" count={readyList.length}>
                    {readyList.length === 0 ? <div className="p-3 text-gray-400">No containers ready</div> : readyList.sort(sortByLastUpdate).map(container => (
                        <ContainerRow 
                            key={container.id} 
                            container={container} 
                            onOpen={onOpen} 
                        />
                    ))}
                </DashboardSection>

                <DashboardSection title="Currently Assigned" subtitle="Containers assigned to drivers" count={assignedList.length}>
                    {assignedList.length === 0 ? <div className="p-3 text-gray-400">No assigned containers</div> : assignedList.sort(sortByLastUpdate).map(container => (
                        <ContainerRow 
                            key={container.id} 
                            container={container} 
                            onOpen={onOpen} 
                        />
                    ))}
                </DashboardSection>
            </div>
        </div>
    );
}

