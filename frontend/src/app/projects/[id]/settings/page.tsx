'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectSettingsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProject() {
            try {
                const res = await fetch(`http://localhost:3001/api/projects/${id}`);
                const data = await res.json();
                setProject(data);
            } finally {
                setLoading(false);
            }
        }
        fetchProject();
    }, [id]);

    const archiveProject = async () => {
        if (!confirm('Are you sure you want to archive this project?')) return;
        try {
            await fetch(`http://localhost:3001/api/projects/${id}`, { method: 'DELETE' });
            router.push('/projects');
        } catch (e) { }
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>Project Settings</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 className="card-title">General Information</h3>
                <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project Name</label>
                        <input value={project.name} readOnly className="btn btn-outline" style={{ width: '100%', textAlign: 'left', background: 'var(--muted)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Display Name</label>
                        <input defaultValue={project.displayName} className="btn btn-outline" style={{ width: '100%', textAlign: 'left', cursor: 'text' }} />
                    </div>
                    <button className="btn btn-primary" style={{ width: 'fit-content' }}>Save Changes</button>
                </div>
            </div>

            <div className="card" style={{ border: '1px solid var(--destructive)' }}>
                <h3 className="card-title" style={{ color: 'var(--destructive)' }}>Danger Zone</h3>
                <p className="card-description" style={{ marginBottom: '1.5rem' }}>
                    Archiving a project will hide it from the dashboard. This action can be undone by an admin.
                </p>
                <button className="btn btn-outline" style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)' }} onClick={archiveProject}>
                    Archive Project
                </button>
            </div>
        </div>
    );
}
