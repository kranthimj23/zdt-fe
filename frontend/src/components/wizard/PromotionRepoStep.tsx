'use client';

import { useState } from 'react';

export default function PromotionRepoStep({ projectId, onNext, onBack }: { projectId: string, onNext: () => void, onBack: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            repoUrl: formData.get('repoUrl') as string,
            defaultBranch: formData.get('defaultBranch') as string || 'master',
            helmChartsPath: formData.get('helmChartsPath') as string || 'helm-charts',
        };

        try {
            const res = await fetch(`http://localhost:3001/api/projects/${projectId}/promotion-repo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to save promotion repo');
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
            <h2 className="card-title">Step 2: Promotion Repository</h2>
            <p className="card-description" style={{ marginBottom: '2rem' }}>Configure the repository that holds your environment values.</p>

            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{error}</div>}

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Repository URL *</label>
                    <input name="repoUrl" required placeholder="https://github.com/org/promo-helm-charts.git" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Default Branch</label>
                        <input name="defaultBranch" placeholder="master" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Helm Charts Path</label>
                        <input name="helmChartsPath" placeholder="helm-charts" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                    </div>
                </div>
            </div>

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
