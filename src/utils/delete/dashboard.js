export function getDashboardLists(containers = []) {
    const active = containers.filter(c => !c.archivedAt);
    return {
        actionsNeeded: active.filter(c => String(c.status).trim() === 'Loading Complete'),
        readyList: active.filter(c => String(c.status).trim() === 'ALL GOOD, BOOK FOR DELIVERY'),
        assignedList: active.filter(c => String(c.status || '').startsWith('Assigned to Driver'))
    };
}