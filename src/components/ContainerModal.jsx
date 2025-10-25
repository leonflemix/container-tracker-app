import React from 'react';
import useContainerModal from '../hooks/useContainerModal';
import ContainerModalView from './ContainerModalView';

export default function ContainerModal(props) {
    const modal = useContainerModal(props);
    return <ContainerModalView {...modal} {...props} />;
}