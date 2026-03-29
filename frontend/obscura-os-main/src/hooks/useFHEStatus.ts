import { useState, useCallback } from 'react';
import { FHEStepStatus } from '@/lib/constants';

export interface FHEStepState {
  status: FHEStepStatus;
  stepLabel: string;
  stepIndex: number;
  error?: string;
}

const STEP_LABELS: Record<FHEStepStatus, string> = {
  [FHEStepStatus.IDLE]: 'Ready',
  [FHEStepStatus.ENCRYPTING]: 'Encrypting...',
  [FHEStepStatus.COMPUTING]: 'Computing on-chain...',
  [FHEStepStatus.READY]: 'Complete',
  [FHEStepStatus.ERROR]: 'Error',
};

const STEP_INDEX: Record<FHEStepStatus, number> = {
  [FHEStepStatus.IDLE]: -1,
  [FHEStepStatus.ENCRYPTING]: 0,
  [FHEStepStatus.COMPUTING]: 1,
  [FHEStepStatus.READY]: 2,
  [FHEStepStatus.ERROR]: -1,
};

export function useFHEStatus() {
  const [state, setState] = useState<FHEStepState>({
    status: FHEStepStatus.IDLE,
    stepLabel: STEP_LABELS[FHEStepStatus.IDLE],
    stepIndex: -1,
  });

  const setStep = useCallback((status: FHEStepStatus, error?: string) => {
    setState({
      status,
      stepLabel: STEP_LABELS[status],
      stepIndex: STEP_INDEX[status],
      error,
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      status: FHEStepStatus.IDLE,
      stepLabel: STEP_LABELS[FHEStepStatus.IDLE],
      stepIndex: -1,
    });
  }, []);

  return { ...state, setStep, reset };
}
