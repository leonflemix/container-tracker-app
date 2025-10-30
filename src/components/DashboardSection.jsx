// File: src/components/DashboardSection.jsx
// Location: src/components

import React from 'react';

// Simple section wrapper that shows title, count and children list.
export default function DashboardSection({ title, subtitle, count = 0, children, className = '' }) {
    return (
        <section className={`bg-gray-800 rounded-lg shadow p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="text-lg font-semibold">{title} <span className="text-sm text-gray-400">({count})</span></h2>
                    {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
                </div>
            </div>
            <div className="divide-y divide-gray-700">
                {children}
            </div>
        </section>
    );
}
