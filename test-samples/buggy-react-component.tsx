import React, { useState, useEffect } from 'react';

// Issue 1: No proper TypeScript interface for props
const BuggyWorkItemList = (props) => {
    // Issue 2: State not properly typed
    const [workItems, setWorkItems] = useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState();
    
    useEffect(() => {
        // Issue 3: Missing dependency in useEffect
        // Issue 4: No cleanup for async operations
        fetchWorkItems();
    }, []);
    
    const fetchWorkItems = async () => {
        try {
            // Issue 5: Direct API call in component (no separation of concerns)
            const response = await fetch('/api/workitems');
            const data = await response.json();
            
            // Issue 6: No response validation
            setWorkItems(data);
            setLoading(false);
        } catch (err) {
            // Issue 7: Error object not properly typed
            setError(err.message);
            setLoading(false);
        }
    };
    
    // Issue 8: No loading state handling
    if (error) {
        return <div>Error: {error}</div>;
    }
    
    return (
        <div>
            {/* Issue 9: Potential null reference */}
            {workItems.map((item) => (
                // Issue 10: Missing key prop
                <div>
                    {/* Issue 11: No null checking for item properties */}
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {/* Issue 12: Inline event handlers (performance issue) */}
                    <button onClick={() => handleEdit(item.id)}>
                        Edit
                    </button>
                </div>
            ))}
        </div>
    );
    
    // Issue 13: Function declared after return statement
    function handleEdit(id) {
        // Issue 14: No error handling
        props.onEdit(id);
    }
};

// Issue 15: No default props or prop validation
export default BuggyWorkItemList;