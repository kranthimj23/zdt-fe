'use client';

import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();
    const isProjectContext = pathname.startsWith('/projects/') && pathname !== '/projects/new';
    const projectId = isProjectContext ? pathname.split('/')[2] : null;

    return (
        <aside className="sidebar">
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Garuda.One</h2>
            </div>

            <nav>
                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>General</p>
                    <ul style={{ listStyle: 'none' }}>
                        <li>
                            <a href="/projects" className={`btn ${pathname === '/projects' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', border: pathname === '/projects' ? 'none' : undefined }}>
                                Dashboard
                            </a>
                        </li>
                    </ul>
                </div>

                {isProjectContext && (
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Project Context</p>
                        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.25rem' }}>
                            <li>
                                <a href={`/projects/${projectId}`} className={`btn ${pathname === `/projects/${projectId}` ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
                                    Overview
                                </a>
                            </li>
                            <li>
                                <a href={`/projects/${projectId}/source-repos`} className={`btn ${pathname.includes('/source-repos') ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
                                    Source Repos
                                </a>
                            </li>
                            <li>
                                <a href={`/projects/${projectId}/environments`} className={`btn ${pathname.includes('/environments') ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
                                    Environments
                                </a>
                            </li>
                            <li>
                                <a href={`/projects/${projectId}/credentials`} className={`btn ${pathname.includes('/credentials') ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
                                    Credentials
                                </a>
                            </li>
                            <li>
                                <a href={`/projects/${projectId}/branches`} className={`btn ${pathname.includes('/branches') ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
                                    Branch Tracker
                                </a>
                            </li>
                            <li>
                                <a href={`/projects/${projectId}/config`} className={`btn ${pathname.includes('/config') ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
                                    Config Export
                                </a>
                            </li>
                            <li>
                                <a href={`/projects/${projectId}/settings`} className={`btn ${pathname.includes('/settings') ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
                                    Settings
                                </a>
                            </li>
                        </ul>
                    </div>
                )}
            </nav>
        </aside>
    );
}
