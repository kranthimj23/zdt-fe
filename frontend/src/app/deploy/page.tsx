'use client';

import { useState } from 'react';

export default function DeployPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleDeploy = async (type: string) => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/cd/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });
            const data = await res.json();
            setResult(data);
        } catch (error: any) {
            setResult({ success: false, error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>Deploy</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>🏗️</div>
                    <h3 className="card-title">Infra</h3>
                    <button
                        className="btn btn-outline"
                        disabled={loading}
                        onClick={() => alert('Infra deployment not mapped yet')}
                        style={{ width: '100%' }}
                    >
                        Deploy Infra
                    </button>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>🗄️</div>
                    <h3 className="card-title">DB</h3>
                    <button
                        className="btn btn-outline"
                        disabled={loading}
                        onClick={() => alert('DB deployment not mapped yet')}
                        style={{ width: '100%' }}
                    >
                        Deploy DB
                    </button>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '2px solid var(--accent)' }}>
                    <div style={{ fontSize: '2rem' }}>🚀</div>
                    <h3 className="card-title">Application</h3>
                    <button
                        className="btn btn-primary"
                        disabled={loading}
                        onClick={() => handleDeploy('application')}
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Deploying...' : 'Deploy App'}
                    </button>
                </div>
            </div>

            {result && (
                <div style={{ marginTop: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Result</h2>
                    <pre style={{
                        background: 'var(--muted)',
                        padding: '1rem',
                        borderRadius: 'var(--radius)',
                        overflowX: 'auto',
                        fontSize: '0.875rem',
                        border: result.success ? '1px solid var(--success)' : '1px solid var(--destructive)'
                    }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
