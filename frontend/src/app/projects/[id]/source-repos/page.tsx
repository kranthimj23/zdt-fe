'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function SourceReposPage() {
    const { id } = useParams();
    const [repos, setRepos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRepos = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/projects/${id}/source-repos`);
            if (!res.ok) throw new Error('Failed to fetch repositories');
            const data = await res.json();
            setRepos(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRepos();
    }, [id]);

    const verifyRepo = async (repoId: string) => {
        try {
            await fetch(`http://localhost:3001/api/projects/${id}/source-repos/${repoId}/verify`, { method: 'POST' });
            fetchRepos(); // Refresh to show status
        } catch (e) { }
    };

    if (loading) return <div>Loading repositories...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Source Repositories</h1>
                <button className="btn btn-primary">+ Add Repository</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--muted)', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '1rem' }}>Name</th>
                            <th style={{ padding: '1rem' }}>URL</th>
                            <th style={{ padding: '1rem' }}>Type</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {repos.map(repo => (
                            <tr key={repo.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>{repo.name}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{repo.repoUrl}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', background: 'var(--muted)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{repo.repoType}</span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ color: repo.isAccessible ? '#166534' : '#b91c1c', fontSize: '0.875rem' }}>
                                        {repo.isAccessible ? '✓ Accessible' : '✗ Unverified'}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => verifyRepo(repo.id)}>Verify</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
