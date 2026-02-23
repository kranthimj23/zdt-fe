'use client';

import { useState } from 'react';
import ProjectDetailsStep from '../../../components/wizard/ProjectDetailsStep';
import PromotionRepoStep from '../../../components/wizard/PromotionRepoStep';
import SourceReposStep from '../../../components/wizard/SourceReposStep';
import EnvironmentsStep from '../../../components/wizard/EnvironmentsStep';
import CredentialsStep from '../../../components/wizard/CredentialsStep';
import SummaryStep from '../../../components/wizard/SummaryStep';

const steps = [
    { id: 1, title: 'Project Details' },
    { id: 2, title: 'Promotion Repo' },
    { id: 3, title: 'Source Repos' },
    { id: 4, title: 'Environments' },
    { id: 5, title: 'Credentials' },
    { id: 6, title: 'Finish' },
];

export default function NewProjectWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('');

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create New Project</h1>
                <p style={{ color: 'var(--muted-foreground)' }}>Follow the steps to register and configure your project.</p>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
                <div style={{
                    position: 'absolute', top: '15px', left: '0', right: '0', height: '2px',
                    background: 'var(--border)', zIndex: 0
                }} />
                <div style={{
                    position: 'absolute', top: '15px', left: '0', width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                    height: '2px', background: 'var(--accent)', zIndex: 0, transition: 'width 0.3s ease'
                }} />

                {steps.map((step) => (
                    <div key={step.id} style={{ zIndex: 1, textAlign: 'center', background: 'var(--background)', padding: '0 10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', background: currentStep >= step.id ? 'var(--accent)' : 'var(--muted)',
                            color: currentStep >= step.id ? 'white' : 'var(--muted-foreground)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 'bold', margin: '0 auto 0.5rem'
                        }}>
                            {step.id}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: currentStep === step.id ? 600 : 400 }}>{step.title}</div>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                {currentStep === 1 && <ProjectDetailsStep onNext={(id: string, name: string) => { setProjectId(id); setProjectName(name); nextStep(); }} />}
                {currentStep === 2 && <PromotionRepoStep projectId={projectId!} onNext={nextStep} onBack={prevStep} />}
                {currentStep === 3 && <SourceReposStep projectId={projectId!} onNext={nextStep} onBack={prevStep} />}
                {currentStep === 4 && <EnvironmentsStep projectId={projectId!} onNext={nextStep} onBack={prevStep} />}
                {currentStep === 5 && <CredentialsStep projectId={projectId!} onNext={nextStep} onBack={prevStep} />}
                {currentStep === 6 && <SummaryStep projectId={projectId!} projectName={projectName} />}
            </div>
        </div>
    );
}
