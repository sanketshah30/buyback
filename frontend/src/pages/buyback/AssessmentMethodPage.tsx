import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ImageAssessmentIcon, QuestionnaireIcon, VideoAssessmentIcon } from '../../components/ui/icons';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import './AssessmentMethodPage.css';

const METHODS = [
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <PageShell title="Physical assessment" subtitle="Choose how you'd like to assess your device's condition">
      <ProgressSteps current={4} total={10} />

      <div className="field-group">
        {METHODS.map(({ id: methodId, title, description, Icon }) => (
          <Card key={methodId} interactive onClick={() => navigate(`/buyback/${id}/assessment/${methodId}`)}>
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
