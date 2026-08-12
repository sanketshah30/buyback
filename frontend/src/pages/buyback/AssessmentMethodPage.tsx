import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';

const METHODS = [
  {
    id: 'questionnaire',
    title: 'Questionnaire based',
    description: 'Answer a few simple questions about the device condition.',
    icon: '📝',
  },
  {
    id: 'image',
    title: 'Image based AI-assessment',
    description: 'Upload 6 photos and let our AI assess the condition automatically.',
    icon: '📸',
  },
  {
    id: 'video',
    title: 'Video based AI-assessment',
    description: 'Record a short walkaround video for an instant AI assessment.',
    icon: '🎥',
  },
];

export function AssessmentMethodPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <PageShell title="Physical assessment" subtitle="Choose how you'd like to assess your device's condition">
      <ProgressSteps current={4} total={12} />

      <div className="field-group">
        {METHODS.map((method) => (
          <Card key={method.id} interactive onClick={() => navigate(`/buyback/${id}/assessment/${method.id}`)}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.6rem' }}>{method.icon}</span>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--color-text)' }}>{method.title}</h3>
                <p style={{ marginTop: 4 }}>{method.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
