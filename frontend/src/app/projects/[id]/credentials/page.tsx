'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function CredentialsPage() {
    const { id } = useParams();
    const [creds, setCreds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCreds = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/projects/${id}/credentials`);
            const data = await res.json();
            setCreds(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCreds();
    }, [id]);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Credentials</h1>
                <button className="btn btn-primary">+ Add Credential</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--muted)', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '1rem' }}>Name</th>
                            <th style={{ padding: '1rem' }}>Type</th>
                            <th style={{ padding: '1rem' }}>Expires</th>
                            <th style={{ padding: '1rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {creds.map(cred => (
                            <tr key={cred.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>{cred.name}</td>
                                <td style={{ padding: '1rem' }}>{cred.type}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                    {cred.expiresAt ? new Date(cred.expiresAt).toLocaleDateString() : 'Never'}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button className="btn btn-outline" style={{ fontSize: '0.75rem', color: 'var(--destructive)' }}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
