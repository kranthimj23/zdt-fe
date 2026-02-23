'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function EnvironmentsPage() {
    const { id } = useParams();
    const [envs, setEnvs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEnvs = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/projects/${id}/environments`);
            const data = await res.json();
            setEnvs(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEnvs();
    }, [id]);

    return (
        <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>Environments</h1>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {envs.map((env, index) => (
                    <div key={env.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            {env.promotionOrder}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 className="card-title">{env.displayName}</h3>
                            <p className="card-description">Internal Name: {env.name} | Values: {env.valuesFolder}</p>
                        </div>
                        <div>
                            {env.isProduction && <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Production</span>}
                        </div>
                        <button className="btn btn-outline">Edit</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
