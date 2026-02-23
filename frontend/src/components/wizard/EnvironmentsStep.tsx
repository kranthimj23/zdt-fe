'use client';

import { useState } from 'react';

export default function EnvironmentsStep({ projectId, onNext, onBack }: { projectId: string, onNext: () => void, onBack: () => void }) {
    const [envs, setEnvs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const applyTemplate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3001/api/projects/${projectId}/environments/apply-template`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to apply template');
            const data = await res.json();
            // After template applied successfully
            onNext();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addManualEnv = () => {
        setEnvs([...envs, { name: '', displayName: '', valuesFolder: '', promotionOrder: envs.length + 1 }]);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (envs.length === 0) {
            setError("Please apply a template or add environments manually.");
            return;
        }
        setLoading(true);
        try {
            for (const env of envs) {
                const res = await fetch(`http://localhost:3001/api/projects/${projectId}/environments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(env),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(`Failed to save ${env.name}: ${err.message}`);
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
        <div>
            <h2 className="card-title">Step 4: Environments</h2>
            <p className="card-description" style={{ marginBottom: '2rem' }}>Define your environment promotion pipeline.</p>

            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{error}</div>}

            <div style={{ display: 'grid', gap: '2rem' }}>
                <div style={{ border: '1px dashed var(--border)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Use Recommended Template</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                        Applies: dev → sit → uat → pre-prod → prod
                    </p>
                    <button type="button" className="btn btn-outline" onClick={applyTemplate} disabled={loading}>
                        {loading ? 'Applying...' : 'Use Default Template'}
                    </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <span style={{ background: 'var(--background)', padding: '0 1rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>OR CONFIGURE MANUALLY</span>
                </div>

                <form onSubmit={handleManualSubmit}>
                    {envs.length > 0 && (
                        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                            {envs.map((env, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '0.5rem' }}>
                                    <input value={env.name} onChange={e => {
                                        const n = [...envs]; n[index].name = e.target.value; n[index].valuesFolder = `${e.target.value}-values`; setEnvs(n);
                                    }} placeholder="dev" className="btn btn-outline" style={{ textAlign: 'left', cursor: 'text' }} />
                                    <input value={env.displayName} onChange={e => {
                                        const n = [...envs]; n[index].displayName = e.target.value; setEnvs(n);
                                    }} placeholder="Development" className="btn btn-outline" style={{ textAlign: 'left', cursor: 'text' }} />
                                    <input value={env.valuesFolder} readOnly className="btn btn-outline" style={{ textAlign: 'left', background: 'var(--muted)' }} />
                                </div>
                            ))}
                        </div>
                    )}
                    <button type="button" className="btn btn-outline" onClick={addManualEnv}>+ Add Environment</button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                        <button type="button" className="btn btn-outline" onClick={onBack}>Back</button>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" className="btn btn-outline" onClick={onNext}>Skip</button>
                            <button type="submit" className="btn btn-primary" disabled={loading || envs.length === 0}>
                                {loading ? 'Saving...' : 'Next Step ->'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
