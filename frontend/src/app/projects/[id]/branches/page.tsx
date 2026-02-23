'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function BranchTrackerPage() {
    const { id } = useParams();
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBranches() {
            try {
                const res = await fetch(`http://localhost:3001/api/projects/${id}/branches`);
                const data = await res.json();
                setBranches(data);
            } finally {
                setLoading(false);
            }
        }
        fetchBranches();
    }, [id]);

    if (loading) return <div>Loading release tracking...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Branch Tracker</h1>
                <button className="btn btn-primary">+ New Release</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--muted)', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '1rem' }}>Branch Name</th>
                            <th style={{ padding: '1rem' }}>Version</th>
                            <th style={{ padding: '1rem' }}>Created</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {branches.map(branch => (
                            <tr key={branch.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>{branch.branchName}</td>
                                <td style={{ padding: '1rem' }}>{branch.version}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(branch.createdAt).toLocaleDateString()}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', background: branch.isActive ? '#dcfce7' : 'var(--muted)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                        {branch.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {branches.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No releases tracked yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
