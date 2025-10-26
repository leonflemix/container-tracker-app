import React from 'react';
import Dashboard from './components/Dashboard';
import useContainers from './hooks/useContainers'; // whatever hook you use to fetch containers

export default function App() {
    const { containers = [], openContainer } = useContainers(); // adapt to your data hooks
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Dashboard containers={containers} onOpen={(c) => openContainer(c)} />
        </div>
    );
}