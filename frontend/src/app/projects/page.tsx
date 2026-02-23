'use client';

import { useEffect, useState } from 'react';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProjects() {
            try {
                const res = await fetch('http://localhost:3001/api/projects');
                if (!res.ok) throw new Error('Failed to fetch projects');
                const data = await res.json();
                setProjects(data.items);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, []);

    if (loading) return <div>Loading projects...</div>;
    if (error) return <div>Error: {error}</div>;

    if (projects.length === 0) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Projects</h1>
                    <a href="/projects/new" className="btn btn-primary">+ New Project</a>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                    <h2 className="card-title">No projects registered yet</h2>
                    <p className="card-description" style={{ marginBottom: '2rem' }}>
                        Get started by creating your first project.
                    </p>
                    <a href="/projects/new" className="btn btn-primary">Create First Project</a>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Projects</h1>
                <a href="/projects/new" className="btn btn-primary">+ New Project</a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {projects.map((project) => (
                    <a key={project.id} href={`/projects/${project.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>{project.displayName}</h3>
                            <span style={{
                                fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: project.status === 'active' ? '#dcfce7' : '#f3f4f6',
                                color: project.status === 'active' ? '#166534' : '#374151', borderRadius: '12px', fontWeight: 600
                            }}>
                                {project.status === 'active' ? 'Active' : 'Archived'}
                            </span>
                        </div>
                        <p className="card-description" style={{ marginBottom: '1.5rem', height: '3rem', overflow: 'hidden' }}>
                            {project.description || 'No description provided.'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                            <span>Team: {project.team}</span>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
