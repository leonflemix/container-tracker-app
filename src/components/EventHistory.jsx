// File: src/components/EventHistory.jsx
// Location: src/components

import React from 'react';
import { safeToDate } from '../utils/dates';

// Renders a vertical list of events (same markup used in original file)
export default function EventHistory({ events = [] }) {
    return (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {events.length > 0 ? (
                events.map(event => {
                    const eventDate = safeToDate(event.timestamp);
                    return (
                        <div key={event.id} className="bg-gray-700 p-3 rounded-md text-sm">
                            <p className="font-bold text-gray-200">{event.details?.action}</p>
                            {event.details?.changes && <p className="text-gray-400 text-xs mt-1">{event.details.changes}</p>}
                            <p className="text-xs text-gray-500 text-right mt-1">{eventDate ? eventDate.toLocaleString() : 'Invalid Date'}</p>
                        </div>
                    );
                })
            ) : (
                <p className="text-gray-500">No events found for this container.</p>
            )}
        </div>
    );
}
