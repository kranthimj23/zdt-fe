'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PromotionRepoPage() {
    const { id } = useParams();
    const [repo, setRepo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRepo() {
            try {
                const res = await fetch(`http://localhost:3001/api/projects/${id}/promotion-repo`);
                const data = await res.json();
                setRepo(data);
            } finally {
                setLoading(false);
            }
        }
        fetchRepo();
    }, [id]);

    if (loading) return <div>Loading promotion repo...</div>;

    return (
        <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>Promotion Repository</h1>

            <div className="card">
                <h3 className="card-title">Repository Configuration</h3>
                {repo ? (
                    <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Repository URL</label>
                            <input value={repo.repoUrl} readOnly className="btn btn-outline" style={{ width: '100%', textAlign: 'left', background: 'var(--muted)' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Default Branch</label>
                                <input value={repo.defaultBranch} readOnly className="btn btn-outline" style={{ width: '100%', textAlign: 'left', background: 'var(--muted)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Helm Charts Path</label>
                                <input value={repo.helmChartsPath} readOnly className="btn btn-outline" style={{ width: '100%', textAlign: 'left', background: 'var(--muted)' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary">Update Config</button>
                            <button className="btn btn-outline">Verify Connection</button>
                        </div>
                    </div>
                ) : (
                    <p>Not configured yet.</p>
                )}
            </div>
        </div>
    );
}
