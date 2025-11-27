// File: src/components/ContainerLifecycleStepper.jsx

import React from 'react';
import { CONTAINER_STATUSES } from '../constants';

export default function ContainerLifecycleStepper({ status }) {
    const steps = [
        { key: 'New', label: 'New', icon: '🆕' },
        { key: 'In Yard', label: 'In Yard', icon: '🏞️' },
        { key: 'Loading Complete', label: 'Loaded', icon: '☑️' },
        { key: 'Assigned', label: 'Assigned', icon: '👨‍✈️' },
        { key: 'Pier Accepted', label: 'Done', icon: 'Y' }
    ];

    // Determine current step index
    let activeIndex = -1;
    
    // Normalize status for comparison
    if (status === 'New') activeIndex = 0;
    else if (status === 'Loading Complete') activeIndex = 2;
    else if (status && status.startsWith('Assigned to Driver')) activeIndex = 3;
    else if (status === 'Pier Accepted') activeIndex = 4;
    else if (status === 'Denied' || status.includes('Denied')) activeIndex = 3; // Show error state roughly at assignment/pier
    else {
        // Assume anything else is "In Yard" or "Processing" (index 1)
        activeIndex = 1;
    }

    // Special check for "Ready for Delivery" which is between Yard and Loading
    if (status === 'ALL GOOD, BOOK FOR DELIVERY') activeIndex = 1; 

    return (
        <div className="w-full py-4 px-2">
            <div className="relative flex items-center justify-between">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-700 -z-10"></div>
                <div 
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 -z-10 transition-all duration-500"
                    style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index <= activeIndex;
                    const isCurrent = index === activeIndex;

                    return (
                        <div key={step.key} className="flex flex-col items-center bg-gray-800 px-2 rounded-full">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                                {isCompleted ? '✓' : index + 1}
                            </div>
                            <span className={`text-xs mt-1 font-semibold ${isCurrent ? 'text-blue-400' : 'text-gray-500'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}