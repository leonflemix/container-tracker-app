import React, { useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import InputField from './InputField';

export default function ReportsPage({ archivePath, collections }) {
    const [reportType, setReportType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateReport = async () => {
        if (!reportType) {
            alert('Please select a report type.');
            return;
        }

        setIsLoading(true);
        setReportData(null);

        try {
            let q;
            let summary = '';
            const isDateRangeReport = ['shippedByDate', 'byDriver', 'holesBefore', 'holesAfterOnly'].includes(reportType);
            if (isDateRangeReport && (!startDate || !endDate)) {
                alert('Please select a start and end date.');
                setIsLoading(false);
                return;
            }
            const start = isDateRangeReport ? Timestamp.fromDate(new Date(startDate)) : null;
            const end = isDateRangeReport ? Timestamp.fromDate(new Date(endDate)) : null;

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
                    alert('Please select a driver.');
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
            setReportData({ summary: 'Error generating report. You may need to create a composite index in Firestore. Check the console for a direct link.', data: [] });
        }

        setIsLoading(false);
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
                            {collections.drivers.map(d => <option key={d.docId} value={d.name}>{d.name}</option>)}
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
                    <h3 className="font-semibold text-lg">Report Result:</h3>
                    <p className="mt-2 text-gray-200">{reportData.summary}</p>
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