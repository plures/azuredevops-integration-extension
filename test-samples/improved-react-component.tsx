import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Proper TypeScript interfaces
interface WorkItem {
    id: number;
    title: string;
    description?: string;
    state: string;
    assignedTo?: string;
}

interface WorkItemListProps {
    apiEndpoint: string;
    onEdit: (id: number) => void;
    onError?: (error: string) => void;
    maxItems?: number;
}

interface ApiResponse {
    data: WorkItem[];
    success: boolean;
    error?: string;
}

// Custom hook for data fetching
const useWorkItems = (apiEndpoint: string, onError?: (error: string) => void) => {
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const fetchWorkItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(apiEndpoint, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result: ApiResponse = await response.json();
            
            // Validate response structure
            if (!result.success || !Array.isArray(result.data)) {
                throw new Error('Invalid response format from API');
            }
            
            // Validate work items
            const validatedItems = result.data.filter((item): item is WorkItem => {
                return (
                    typeof item.id === 'number' &&
                    typeof item.title === 'string' &&
                    typeof item.state === 'string'
                );
            });
            
            setWorkItems(validatedItems);
            
        } catch (err) {
            let errorMessage = 'An unknown error occurred';
            
            if (err instanceof Error) {
                if (err.name === 'AbortError') {
                    errorMessage = 'Request timed out';
                } else {
                    errorMessage = err.message;
                }
            }
            
            setError(errorMessage);
            onError?.(errorMessage);
            console.error('Failed to fetch work items:', err);
            
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint, onError]);
    
    useEffect(() => {
        fetchWorkItems();
    }, [fetchWorkItems]);
    
    return { workItems, loading, error, refetch: fetchWorkItems };
};

// Loading component
const LoadingSpinner: React.FC = () => (
    <div className="loading-container" role="status" aria-label="Loading work items">
        <div className="spinner" />
        <span>Loading work items...</span>
    </div>
);

// Error component
interface ErrorDisplayProps {
    message: string;
    onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => (
    <div className="error-container" role="alert">
        <h3>Error Loading Work Items</h3>
        <p>{message}</p>
        {onRetry && (
            <button onClick={onRetry} className="retry-button">
                Try Again
            </button>
        )}
    </div>
);

// Work item component
interface WorkItemCardProps {
    item: WorkItem;
    onEdit: (id: number) => void;
}

const WorkItemCard: React.FC<WorkItemCardProps> = React.memo(({ item, onEdit }) => {
    const handleEdit = useCallback(() => {
        onEdit(item.id);
    }, [item.id, onEdit]);
    
    return (
        <div className="work-item-card" data-testid={`work-item-${item.id}`}>
            <h3>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
            <div className="work-item-meta">
                <span className={`state state-${item.state.toLowerCase()}`}>
                    {item.state}
                </span>
                {item.assignedTo && (
                    <span className="assignee">Assigned to: {item.assignedTo}</span>
                )}
            </div>
            <button
                onClick={handleEdit}
                className="edit-button"
                aria-label={`Edit work item: ${item.title}`}
            >
                Edit
            </button>
        </div>
    );
});

WorkItemCard.displayName = 'WorkItemCard';

// Main component
const ImprovedWorkItemList: React.FC<WorkItemListProps> = ({
    apiEndpoint,
    onEdit,
    onError,
    maxItems = 50
}) => {
    const { workItems, loading, error, refetch } = useWorkItems(apiEndpoint, onError);
    
    // Memoize filtered items to prevent unnecessary re-renders
    const displayItems = useMemo(() => {
        return workItems.slice(0, maxItems);
    }, [workItems, maxItems]);
    
    const handleRetry = useCallback(() => {
        refetch();
    }, [refetch]);
    
    if (loading) {
        return <LoadingSpinner />;
    }
    
    if (error) {
        return <ErrorDisplay message={error} onRetry={handleRetry} />;
    }
    
    if (displayItems.length === 0) {
        return (
            <div className="empty-state">
                <h3>No Work Items Found</h3>
                <p>There are no work items to display at this time.</p>
                <button onClick={handleRetry} className="refresh-button">
                    Refresh
                </button>
            </div>
        );
    }
    
    return (
        <div className="work-item-list" role="list">
            <header className="list-header">
                <h2>Work Items ({displayItems.length})</h2>
                <button onClick={handleRetry} className="refresh-button">
                    Refresh
                </button>
            </header>
            
            <div className="work-items-container">
                {displayItems.map((item) => (
                    <WorkItemCard
                        key={item.id}
                        item={item}
                        onEdit={onEdit}
                    />
                ))}
            </div>
            
            {workItems.length > maxItems && (
                <div className="pagination-info">
                    Showing {maxItems} of {workItems.length} items
                </div>
            )}
        </div>
    );
};

// Default props and prop validation
ImprovedWorkItemList.defaultProps = {
    maxItems: 50
};

export default ImprovedWorkItemList;