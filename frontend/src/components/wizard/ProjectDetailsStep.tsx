'use client';

import { useState } from 'react';

export default function ProjectDetailsStep({ onNext }: { onNext: (id: string, name: string) => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            displayName: formData.get('displayName') as string,
            description: formData.get('description') as string,
            team: formData.get('team') as string,
            teamEmail: formData.get('teamEmail') as string,
        };

        try {
            const res = await fetch('http://localhost:3001/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create project');
            }

            const project = await res.json();
            onNext(project.id, project.displayName);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="card-title">Step 1: Project Details</h2>
            <p className="card-description" style={{ marginBottom: '2rem' }}>Define the core identity of your project.</p>

            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{error}</div>}

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project Name *</label>
                    <input name="name" required placeholder="payment-gateway" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Lowercase, alphanumeric with hyphens.</p>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Display Name *</label>
                    <input name="displayName" required placeholder="Payment Gateway Service" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                    <textarea name="description" rows={3} className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text', minHeight: '80px', padding: '0.75rem' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Team *</label>
                        <input name="team" required placeholder="payments-team" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Team Email *</label>
                        <input name="teamEmail" type="email" required placeholder="pay-team@company.com" className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem' }}>
                <button type="button" className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Next Step ->'}
                </button>
            </div>
        </form>
    );
}
