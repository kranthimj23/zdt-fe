'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function ProjectDashboard() {
    const { id } = useParams();
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const res = await fetch(`http://localhost:3001/api/projects/${id}/config`);
                if (!res.ok) throw new Error('Failed to fetch project configuration');
                const data = await res.json();
                setConfig(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchConfig();
    }, [id]);

    if (loading) return <div>Loading dashboard...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>{config.project.displayName}</h1>
                    <p style={{ color: 'var(--muted-foreground)' }}>{config.project.team} | {config.project.name}</p>
                </div>
                <a href={`/projects/${id}/settings`} className="btn btn-outline">Settings</a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {/* Promotion Repo Card */}
                <div className="card">
                    <h3 className="card-title">Promotion Repository</h3>
                    {config.promotionRepo ? (
                        <div>
                            <p style={{ fontSize: '0.875rem', wordBreak: 'break-all', marginBottom: '0.5rem' }}>{config.promotionRepo.repoUrl}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Branch: {config.promotionRepo.defaultBranch}</p>
                            <div style={{ marginTop: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#166534', background: '#dcfce7', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>✓ Verified</span>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--muted-foreground)' }}>Not configured.</p>
                    )}
                </div>

                {/* Source Repos Card */}
                <div className="card">
                    <h3 className="card-title">Source Repositories</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{config.sourceRepos.length}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Repositories registered</p>
                    <div style={{ marginTop: '1rem' }}>
                        <a href={`/projects/${id}/source-repos`} className="btn btn-outline" style={{ fontSize: '0.75rem' }}>Manage Repos</a>
                    </div>
                </div>

                {/* Environments Card */}
                <div className="card">
                    <h3 className="card-title">Environments</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {config.environments.map((env: any) => (
                            <span key={env.name} style={{ fontSize: '0.75rem', background: 'var(--muted)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                {env.name}
                            </span>
                        ))}
                    </div>
                    <div style={{ marginTop: '1.5rem' }}>
                        <a href={`/projects/${id}/environments`} className="btn btn-outline" style={{ fontSize: '0.75rem' }}>Manage Environments</a>
                    </div>
                </div>

                {/* Active Branches Card */}
                <div className="card">
                    <h3 className="card-title">Current Releases</h3>
                    <div style={{ marginTop: '0.5rem' }}>
                        {Object.keys(config.activeBranches).length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.875rem' }}>
                                {Object.entries(config.activeBranches).map(([env, branch]: [string, any]) => (
                                    <li key={env} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ fontWeight: 500 }}>{env}:</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{branch}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>No active releases tracked yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
