// File: src/components/ReportsPage.jsx
// Location: src/components

import React, { useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import InputField from './InputField';
import { useAppContext } from '../context/AppContext';

export default function ReportsPage() {
    const { paths, collections: collectionsData, addToast } = useAppContext();
    const { archivePath } = paths;

    const collections = collectionsData || {};
    const drivers = collections.drivers || [];

    const [reportType, setReportType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateReport = async () => {
        if (!reportType) {
            addToast('Please select a report type.', 'error');
            return;
        }

        setIsLoading(true);
        setReportData(null);

        try {
            let q;
            let summary = '';
            const isDateRangeReport = ['shippedByDate', 'byDriver', 'holesBefore', 'holesAfterOnly'].includes(reportType);
            if (isDateRangeReport && (!startDate || !endDate)) {
                addToast('Please select a start and end date.', 'error');
                setIsLoading(false);
                return;
            }
            const start = isDateRangeReport ? Timestamp.fromDate(new Date(startDate)) : null;
            const end = isDateRangeReport ? Timestamp.fromDate(new Date(endDate)) : null;
            // Set end date to end of day
            if (end) end.seconds += 86399; 

            if (reportType === 'shippedByDate') {
                q = query(collection(db, archivePath), where('archivedAt', '>=', start), where('archivedAt', '<=', end));
                summary = (size) => `Found ${size} shipped containers in this period.`;
            } else if (reportType === 'holesBefore') {
                q = query(collection(db, archivePath), where('hasHolesBeforeSquish', '==', true), where('archivedAt', '>=', start), where('archivedAt', '<=', end));
                summary = (size) => `Found ${size} containers with holes before squishing in this period.`;
            } else if (reportType === 'holesAfterOnly') {
                q = query(collection(db, archivePath), where('hasHolesBeforeSquish', '==', false), where('hasHolesAfterSquish', '==', true), where('archivedAt', '>=', start), where('archivedAt', '<=', end));
                summary = (size) => `Found ${size} containers with holes only after squishing in this period.`;
            } else if (reportType === 'byDriver') {
                if (!selectedDriver) {
                    addToast('Please select a driver.', 'error');
                    setIsLoading(false);
                    return;
                }
                q = query(collection(db, archivePath), where('deliveryDriver', '==', selectedDriver), where('archivedAt', '>=', start), where('archivedAt', '<=', end));
                summary = (size) => `Found ${size} containers delivered by ${selectedDriver} in this period.`;
            }

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReportData({
                summary: summary(querySnapshot.size),
                data: data
            });

        } catch (error) {
            console.error("Error generating report:", error);
            addToast('Error generating report. Check console for index link.', 'error');
            setReportData({ summary: 'Error generating report.', data: [] });
        }

        setIsLoading(false);
    };

    // --- NEW: CSV Export Logic ---
    const downloadCSV = () => {
        if (!reportData || !reportData.data || reportData.data.length === 0) return;

        const headers = ["Container #", "Booking #", "Type", "Driver", "Seal", "Archived Date", "Days in Yard", "Holes Before", "Holes After"];
        const rows = reportData.data.map(c => [
            c.id,
            c.booking,
            c.bookedFor,
            c.deliveryDriver || '',
            c.seal || '',
            c.archivedAt ? new Date(c.archivedAt.seconds * 1000).toLocaleDateString() : '',
            c.daysInYard || '',
            c.hasHolesBeforeSquish ? 'Yes' : 'No',
            c.hasHolesAfterSquish ? 'Yes' : 'No'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `report_${reportType}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Generate a Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Report Type</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Select Report --</option>
                        <option value="shippedByDate">Containers Shipped by Date</option>
                        <option value="holesBefore">Containers with Holes Before Squish</option>
                        <option value="holesAfterOnly">Containers with Holes Only After Squish</option>
                        <option value="byDriver">Containers Delivered by Driver</option>
                    </select>
                </div>

                {(reportType === 'shippedByDate' || reportType === 'byDriver' || reportType === 'holesBefore' || reportType === 'holesAfterOnly') && (
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        <InputField label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                )}

                {reportType === 'byDriver' && (
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Driver</label>
                        <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Select Driver --</option>
                            {drivers.map(d => <option key={d.docId} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="md:col-span-2">
                    <button onClick={handleGenerateReport} disabled={isLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">
                        {isLoading ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            {reportData && (
                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-semibold text-lg">Report Result:</h3>
                            <p className="mt-1 text-gray-200">{reportData.summary}</p>
                        </div>
                        {reportData.data && reportData.data.length > 0 && (
                            <button 
                                onClick={downloadCSV}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download CSV
                            </button>
                        )}
                    </div>
                    {reportData.data && reportData.data.length > 0 && (
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm text-left text-gray-300">
                                <thead className="bg-gray-600 text-xs text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-4 py-2">Container #</th>
                                        <th className="px-4 py-2">Booking #</th>
                                        <th className="px-4 py-2">Delivery Driver</th>
                                        <th className="px-4 py-2">Archived At</th>
                                        <th className="px-4 py-2">Holes Before</th>
                                        <th className="px-4 py-2">Holes After</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-500">
                                    {reportData.data.map(container => (
                                        <tr key={container.id} className="hover:bg-gray-600">
                                            <td className="px-4 py-2 font-medium">{container.id}</td>
                                            <td className="px-4 py-2">{container.booking}</td>
                                            <td className="px-4 py-2">{container.deliveryDriver || 'N/A'}</td>
                                            <td className="px-4 py-2">{container.archivedAt ? new Date(container.archivedAt.seconds * 1000).toLocaleString() : 'N/A'}</td>
                                            <td className="px-4 py-2">{container.hasHolesBeforeSquish ? 'Yes' : 'No'}</td>
                                            <td className="px-4 py-2">{container.hasHolesAfterSquish ? 'Yes' : 'No'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}