'use client';

import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Cpu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiliconFlow } from '@/hooks/useSiliconFlow';
import { Stepper } from '@/components/Stepper';
import { RTLPhase } from '@/components/phases/RTLPhase';
import { SynthesisPhase } from '@/components/phases/SynthesisPhase';
import { LayoutPhase } from '@/components/phases/LayoutPhase';
import { FabricationPhase } from '@/components/phases/FabricationPhase';
import { Button } from '@/components/ui/button';

const pageVariants: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28 } },
  exit:    { opacity: 0, x: -40, transition: { duration: 0.18 } },
};

export default function Home() {
  const flow = useSiliconFlow();

  return (
    <main className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3 shrink-0">
        <Cpu className="text-cyan-400 w-5 h-5" />
        <span className="text-zinc-100 font-semibold tracking-tight">Silicon Path</span>
        <span className="text-zinc-600 text-sm">— ASIC Design Flow</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-zinc-700 text-xs font-mono">
            RTL → Synthesis → Layout → Fabrication
          </span>
        </div>
      </header>

      {/* Stepper */}
      <div className="px-6 py-3 border-b border-zinc-800 shrink-0">
        <Stepper currentStep={flow.currentStep} stepIndex={flow.stepIndex} />
      </div>

      {/* Phase content */}
      <div className="flex-1 overflow-hidden px-6 py-4 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={flow.currentStep}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full"
          >
            {flow.currentStep === 'rtl' && (
              <RTLPhase
                verilogCode={flow.verilogCode}
                setVerilogCode={flow.setVerilogCode}
                compile={flow.compile}
                parseError={flow.parseError}
                netlist={flow.netlist}
              />
            )}
            {flow.currentStep === 'synthesis' && (
              <SynthesisPhase
                flowNodes={flow.flowNodes}
                flowEdges={flow.flowEdges}
                netlist={flow.netlist}
              />
            )}
            {flow.currentStep === 'layout' && (
              <LayoutPhase netlist={flow.netlist} />
            )}
            {flow.currentStep === 'fabrication' && (
              <FabricationPhase />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation footer */}
      <footer className="flex justify-between items-center border-t border-zinc-800 px-6 py-3 shrink-0">
        <Button
          variant="outline"
          onClick={flow.goBack}
          disabled={!flow.canGoBack}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <span className="text-zinc-600 text-xs font-mono">
          Step {flow.stepIndex + 1} of 4
        </span>

        <Button
          onClick={flow.goNext}
          disabled={!flow.canGoNext}
          className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold disabled:opacity-30"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </footer>
    </main>
  );
}
