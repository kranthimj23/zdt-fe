'use client';

import { useState } from 'react';

export default function CredentialsStep({ projectId, onNext, onBack }: { projectId: string, onNext: () => void, onBack: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [added, setAdded] = useState<any[]>([]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            type: formData.get('type') as string,
            value: formData.get('value') as string,
            expiresAt: formData.get('expiresAt') as string || undefined,
        };

        try {
            const res = await fetch(`http://localhost:3001/api/projects/${projectId}/credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to save credential');
            }

            setAdded([...added, { name: data.name, type: data.type }]);
            e.currentTarget.reset();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="card-title">Step 5: Credentials</h2>
            <p className="card-description" style={{ marginBottom: '2rem' }}>Store sensitive tokens and keys securely.</p>

            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Credential Name *</label>
                    <input name="name" required placeholder="github-token" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Type *</label>
                        <select name="type" className="btn btn-outline" style={{ width: '100%' }}>
                            <option value="git-token">Git Token</option>
                            <option value="jira-api-key">Jira API Key</option>
                            <option value="gcp-service-account">GCP Service Account</option>
                            <option value="generic">Generic</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Expires At</label>
                        <input name="expiresAt" type="date" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Value *</label>
                    <input name="value" type="password" required className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                </div>

                <button type="submit" className="btn btn-outline" disabled={loading}>
                    {loading ? 'Adding...' : '+ Add Credential'}
                </button>
            </form>

            {added.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Added Credentials:</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {added.map((c, i) => (
                            <li key={i} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{c.name} ({c.type})</span>
                                <span style={{ color: 'var(--success)', marginLeft: 'auto' }}>✓ Added</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={onBack}>Back</button>
                <button type="button" className="btn btn-primary" onClick={onNext}>Finish Setup</button>
            </div>
        </div>
    );
}
