import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ImageAssessmentIcon, QuestionnaireIcon, VideoAssessmentIcon } from '../../components/ui/icons';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { useBuybackDraft } from '../../lib/buybackDraft';
import type { AssessmentMethod } from '../../types/api';
import './AssessmentMethodPage.css';

const METHODS: { id: AssessmentMethod; title: string; description: string; Icon: typeof QuestionnaireIcon }[] = [
  {
    id: 'questionnaire',
    title: 'Questionnaire based',
    description: 'Answer a few simple questions about the device condition.',
    Icon: QuestionnaireIcon,
  },
  {
    id: 'image',
    title: 'Image based AI-assessment',
    description: 'Upload 6 photos and let our AI assess the condition automatically.',
    Icon: ImageAssessmentIcon,
  },
  {
    id: 'video',
    title: 'Video based AI-assessment',
    description: 'Record a short walkaround video for an instant AI assessment.',
    Icon: VideoAssessmentIcon,
  },
];

export function AssessmentMethodPage() {
  const navigate = useNavigate();
  const { draft, setAssessmentMethod } = useBuybackDraft();

  useEffect(() => {
    if (!draft.model || !draft.sku) navigate('/buyback/new', { replace: true });
  }, [draft.model, draft.sku, navigate]);

  return (
    <PageShell title="Physical assessment" subtitle="Choose how you'd like to assess your device's condition">
      <ProgressSteps current={2} total={7} />

      <div className="field-group">
        {METHODS.map(({ id: methodId, title, description, Icon }) => (
          <Card
            key={methodId}
            interactive
            onClick={() => {
              setAssessmentMethod(methodId);
              navigate(`/buyback/new/assessment/${methodId}`);
            }}
          >
            <div className="method-option">
              <span className="method-option__icon">
                <Icon />
              </span>
              <div>
                <h3 className="method-option__title">{title}</h3>
                <p className="method-option__description">{description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
