'use client';

import { cn } from '@/lib/utils';
import { FLOW_STEPS, FLOW_STEP_LABELS, type FlowStep } from '@/types/silicon';
import { Check } from 'lucide-react';

interface StepperProps {
  currentStep: FlowStep;
  stepIndex: number;
}

export function Stepper({ stepIndex }: StepperProps) {
  return (
    <div className="flex items-center w-full max-w-2xl">
      {FLOW_STEPS.map((step, i) => {
        const isComplete = i < stepIndex;
        const isActive = i === stepIndex;

        return (
          <div key={step} className="flex items-center flex-1">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              isActive && 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
              isComplete && 'text-zinc-400',
              !isActive && !isComplete && 'text-zinc-600',
            )}>
              <span className={cn(
                'flex items-center justify-center w-5 h-5 rounded-full text-xs border shrink-0',
                isActive && 'bg-cyan-500 border-cyan-400 text-zinc-950 font-bold',
                isComplete && 'bg-zinc-700 border-zinc-600 text-zinc-300',
                !isActive && !isComplete && 'border-zinc-700 text-zinc-600',
              )}>
                {isComplete ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              {FLOW_STEP_LABELS[step]}
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-2 min-w-4',
                i < stepIndex ? 'bg-cyan-500/40' : 'bg-zinc-800',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
