'use client';

import { useState } from 'react';

export default function SourceReposStep({ projectId, onNext, onBack }: { projectId: string, onNext: () => void, onBack: () => void }) {
    const [repos, setRepos] = useState([{ url: '', name: '', type: 'app' }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addRow = () => setRepos([...repos, { url: '', name: '', type: 'app' }]);
    const removeRow = (index: number) => setRepos(repos.filter((_, i) => i !== index));

    const handleChange = (index: number, field: string, value: string) => {
        const newRepos = [...repos];
        (newRepos[index] as any)[field] = value;
        // Auto-fill name from URL
        if (field === 'url' && !newRepos[index].name) {
            newRepos[index].name = value.split('/').pop()?.replace('.git', '') || '';
        }
        setRepos(newRepos);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            for (const repo of repos) {
                if (!repo.url) continue;
                const res = await fetch(`http://localhost:3001/api/projects/${projectId}/source-repos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        repoUrl: repo.url,
                        name: repo.name || repo.url.split('/').pop()?.replace('.git', '') || 'unnamed',
                        repoType: repo.type,
                    }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(`Failed to save ${repo.url}: ${err.message}`);
                }
            }
            onNext();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="card-title">Step 3: Source Repositories</h2>
            <p className="card-description" style={{ marginBottom: '2rem' }}>Add the microservice repositories used in this project.</p>

            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{error}</div>}

            <div style={{ display: 'grid', gap: '1rem' }}>
                {repos.map((repo, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 120px 40px', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            value={repo.url}
                            onChange={(e) => handleChange(index, 'url', e.target.value)}
                            placeholder="https://github.com/org/repo.git"
                            className="btn btn-outline"
                            style={{ textAlign: 'left', cursor: 'text' }}
                        />
                        <input
                            value={repo.name}
                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                            placeholder="Name"
                            className="btn btn-outline"
                            style={{ textAlign: 'left', cursor: 'text' }}
                        />
                        <select
                            value={repo.type}
                            onChange={(e) => handleChange(index, 'type', e.target.value)}
                            className="btn btn-outline"
                        >
                            <option value="app">App</option>
                            <option value="aql-db">AQL DB</option>
                            <option value="sql-db">SQL DB</option>
                            <option value="infra">Infra</option>
                        </select>
                        <button type="button" onClick={() => removeRow(index)} style={{ color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
                    </div>
                ))}
            </div>

            <button type="button" className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={addRow}>+ Add Row</button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={onBack}>Back</button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" className="btn btn-outline" onClick={onNext}>Skip</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Next Step ->'}
                    </button>
                </div>
            </div>
        </form>
    );
}
