import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { buybackApi } from './buybackApi';
import type {
  AssessmentMethod,
  Brand,
  BuybackRequest,
  Category,
  Model,
  QuestionnaireAnswer,
  Sku,
} from '../types/api';

export interface BuybackDraftState {
  category?: Category;
  brand?: Brand;
  identifier?: { type: 'imei' | 'serial'; value: string };
  model?: Model;
  sku?: Sku;
  assessmentMethod?: AssessmentMethod;
  questionnaireAnswers?: QuestionnaireAnswer[];
  assessmentImages?: File[];
  assessmentVideo?: File;
}

interface BuybackDraftContextValue {
  draft: BuybackDraftState;
  setCategoryBrand: (category: Category, brand: Brand) => void;
  setIdentifier: (identifier: BuybackDraftState['identifier']) => void;
  setProduct: (model: Model, sku: Sku) => void;
  setAssessmentMethod: (method: AssessmentMethod) => void;
  setQuestionnaireAnswers: (answers: QuestionnaireAnswer[]) => void;
  setAssessmentImages: (files: File[]) => void;
  setAssessmentVideo: (file: File) => void;
  reset: () => void;
  /**
   * Nothing is persisted to the server for the whole "new buyback" wizard
   * until this is called (from the valuation step) - this is the single
   * point where a real buyback record, and its {{YYYYMMDD}}-{{Count}}
   * reference ID, gets created. Everything up to here is local component
   * state so category/IMEI/product can be freely edited without any
   * server round-trips, and abandoning the flow never leaves a stray draft
   * behind on the backend.
   */
  submit: () => Promise<BuybackRequest>;
}

const BuybackDraftContext = createContext<BuybackDraftContextValue | undefined>(undefined);

const emptyDraft: BuybackDraftState = {};

export function BuybackDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BuybackDraftState>(emptyDraft);
  // Tracks a partially-created backend record across retries, so retrying a
  // failed submission resumes from the right step instead of creating a
  // duplicate buyback request.
  const createdIdRef = useRef<string | undefined>(undefined);

  const setCategoryBrand = useCallback((category: Category, brand: Brand) => {
    setDraft((prev) => ({ ...prev, category, brand }));
  }, []);

  const setIdentifier = useCallback((identifier: BuybackDraftState['identifier']) => {
    setDraft((prev) => ({ ...prev, identifier }));
  }, []);

  const setProduct = useCallback((model: Model, sku: Sku) => {
    setDraft((prev) => ({ ...prev, model, sku }));
  }, []);

  const setAssessmentMethod = useCallback((assessmentMethod: AssessmentMethod) => {
    setDraft((prev) => ({ ...prev, assessmentMethod }));
  }, []);

  const setQuestionnaireAnswers = useCallback((questionnaireAnswers: QuestionnaireAnswer[]) => {
    setDraft((prev) => ({ ...prev, questionnaireAnswers }));
  }, []);

  const setAssessmentImages = useCallback((assessmentImages: File[]) => {
    setDraft((prev) => ({ ...prev, assessmentImages }));
  }, []);

  const setAssessmentVideo = useCallback((assessmentVideo: File) => {
    setDraft((prev) => ({ ...prev, assessmentVideo }));
  }, []);

  const reset = useCallback(() => {
    createdIdRef.current = undefined;
    setDraft(emptyDraft);
  }, []);

  const submit = useCallback(async (): Promise<BuybackRequest> => {
    if (!draft.category || !draft.brand) throw new Error('Select a category and brand first');
    if (!draft.identifier) throw new Error('Enter the device IMEI/serial number first');
    if (!draft.model || !draft.sku) throw new Error('Select the product model and SKU first');
    if (!draft.assessmentMethod) throw new Error('Choose a physical assessment method first');

    let request: BuybackRequest;
    if (createdIdRef.current) {
      request = await buybackApi.get(createdIdRef.current);
    } else {
      request = await buybackApi.create(draft.category.id, draft.brand.id);
      createdIdRef.current = request.id;
    }

    request = await buybackApi.setDevice(request.id, draft.identifier.value);
    request = await buybackApi.setProduct(request.id, draft.model.id, draft.sku.id);

    if (draft.assessmentMethod === 'questionnaire') {
      request = await buybackApi.submitQuestionnaire(request.id, draft.questionnaireAnswers ?? []);
    } else if (draft.assessmentMethod === 'image') {
      request = await buybackApi.submitImages(request.id, draft.assessmentImages ?? []);
    } else if (draft.assessmentMethod === 'video' && draft.assessmentVideo) {
      request = await buybackApi.submitVideo(request.id, draft.assessmentVideo);
    }

    request = await buybackApi.runValuation(request.id);
    return request;
  }, [draft]);

  const value = useMemo<BuybackDraftContextValue>(
    () => ({
      draft,
      setCategoryBrand,
      setIdentifier,
      setProduct,
      setAssessmentMethod,
      setQuestionnaireAnswers,
      setAssessmentImages,
      setAssessmentVideo,
      reset,
      submit,
    }),
    [
      draft,
      setCategoryBrand,
      setIdentifier,
      setProduct,
      setAssessmentMethod,
      setQuestionnaireAnswers,
      setAssessmentImages,
      setAssessmentVideo,
      reset,
      submit,
    ],
  );

  return <BuybackDraftContext.Provider value={value}>{children}</BuybackDraftContext.Provider>;
}

export function useBuybackDraft(): BuybackDraftContextValue {
  const ctx = useContext(BuybackDraftContext);
  if (!ctx) throw new Error('useBuybackDraft must be used within a BuybackDraftProvider');
  return ctx;
}
