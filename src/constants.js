// File: src/constants.js

export const CONTAINER_STATUSES = [
    { emoji: '🆕', label: 'New', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🏞️', label: 'In Yard', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🏢', label: 'On Floor', isUpdateOption: false, isDispatchOption: false },
    { emoji: '👨🏻‍🏭', label: 'NEEDS WELDING', isUpdateOption: true, isDispatchOption: true },
    { emoji: '🤛🏻💨', label: 'NEED SQUISH', isUpdateOption: true, isDispatchOption: true },
    { emoji: '🤛🏻💨👨🏻‍🏭', label: 'NEED SQUISH AND WELDING', isUpdateOption: true, isDispatchOption: true },
    { emoji: '⚖️🤛🏻💨', label: 'NEEDS WEIGHT AND SQUISH', isUpdateOption: true, isDispatchOption: true },
    { emoji: '⚖️🤛🏻💨👨🏻‍🏭', label: 'NEEDS EVERYTHING', isUpdateOption: true, isDispatchOption: true },
    { emoji: '👨🏻‍🏭🏭', label: 'IN WORKSHOP', isUpdateOption: true, isDispatchOption: true },
    { emoji: '⚙️', label: 'In Shred Tilter', isUpdateOption: false, isDispatchOption: false },
    { emoji: '⚖️', label: 'In Scale Tilter', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🛤️', label: 'In Track Tilter', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🏗️', label: 'At Crane', isUpdateOption: true, isDispatchOption: false },
    { emoji: '⌛', label: 'WAIT FOR UPDATE FROM OFFICE', isUpdateOption: true, isDispatchOption: true },
    { emoji: '🔥', label: 'Busy PARKED AND WAITING', isUpdateOption: true, isDispatchOption: true },
    { emoji: '👍🏻', label: 'ALL GOOD, BOOK FOR DELIVERY', isUpdateOption: true, isDispatchOption: true },
    { emoji: '☑️', label: 'Loading Complete', isUpdateOption: true, isDispatchOption: false },
    { emoji: '🚛', label: 'En Route to Pier', isUpdateOption: true, isDispatchOption: false },
    { emoji: '💨', label: 'Returned Empty', isUpdateOption: false, isDispatchOption: false },
    { emoji: 'Y', label: 'Pier Accepted', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🚫', label: 'Denied', isUpdateOption: false, isDispatchOption: false }, // Kept for historical data
    { emoji: '🚫', label: 'Denied - Awaiting Update', isUpdateOption: true, isDispatchOption: true },
    { emoji: '🛞', label: 'CHASSIS NEEDS REPAIR', isUpdateOption: true, isDispatchOption: true },
    { emoji: '📝', label: 'Docs Issue', isUpdateOption: false, isDispatchOption: false },
    { emoji: '☢️', label: 'Nuclear (On Hold)', isUpdateOption: true, isDispatchOption: false },
    { emoji: '👨‍✈️', label: 'Assigned to Driver', isUpdateOption: false, isDispatchOption: false },
];

