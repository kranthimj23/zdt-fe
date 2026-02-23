'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function ConfigExportPage() {
    const { id } = useParams();
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const res = await fetch(`http://localhost:3001/api/projects/${id}/config`);
                const data = await res.json();
                setConfig(data);
            } finally {
                setLoading(false);
            }
        }
        fetchConfig();
    }, [id]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
        alert('Config copied to clipboard!');
    };

    if (loading) return <div>Loading config...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Configuration Export</h1>
                <button className="btn btn-primary" onClick={copyToClipboard}>Copy JSON</button>
            </div>

            <div className="card" style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', overflowX: 'auto' }}>
                <pre style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {JSON.stringify(config, null, 2)}
                </pre>
            </div>
        </div>
    );
}
