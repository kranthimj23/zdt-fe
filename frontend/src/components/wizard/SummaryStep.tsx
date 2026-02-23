'use client';

export default function SummaryStep({ projectId, projectName }: { projectId: string, projectName: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', color: 'var(--success)', marginBottom: '1.5rem' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Project Created Successfully!</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
                "{projectName}" is registered and ready for configuration management.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <a href={`/projects/${projectId}`} className="btn btn-primary" style={{ minWidth: '160px' }}>
                    View Project Dashboard
                </a>
                <a href="/projects/new" className="btn btn-outline" style={{ minWidth: '160px' }}>
                    Create Another
                </a>
            </div>
        </div>
    );
}
