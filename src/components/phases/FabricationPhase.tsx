'use client';

import { motion, type Variants } from 'framer-motion';
import { Factory, Disc, Zap, Scissors, Layers, Waves } from 'lucide-react';

const PROCESS_LAYERS = [
  { name: 'Passivation (SiN₄)',    color: '#374151', stroke: '#6b7280', description: 'Protective cap layer — prevents oxidation and mechanical damage' },
  { name: 'Metal 2 (Cu)',          color: '#0e7490', stroke: '#22d3ee', description: 'Second copper interconnect — long-distance routing' },
  { name: 'Via 1 (W)',             color: '#6b21a8', stroke: '#a855f7', description: 'Tungsten vias — connects Metal 1 to Metal 2' },
  { name: 'Metal 1 (Cu)',          color: '#1e40af', stroke: '#60a5fa', description: 'First copper interconnect — local cell connections' },
  { name: 'Polysilicon Gate',      color: '#92400e', stroke: '#fbbf24', description: 'Doped poly-Si gate electrode — controls channel conductance' },
  { name: 'Gate Oxide (HfO₂)',    color: '#701a75', stroke: '#e879f9', description: '2–5nm high-k dielectric — electric field couples gate to channel' },
  { name: 'Shallow Trench Iso.', color: '#1e3a8a', stroke: '#3b82f6', description: 'SiO₂ isolation — prevents leakage between adjacent transistors' },
  { name: 'N-Well (P⁺ implant)',  color: '#166534', stroke: '#4ade80', description: 'N-type implant region — hosts PMOS transistors' },
  { name: 'Substrate (p-Si)',      color: '#7c2d12', stroke: '#fb923c', description: 'P-type silicon bulk wafer — starting material, 300mm diameter' },
];

const PROCESS_STEPS = [
  { icon: Disc, label: 'Wafer Preparation', desc: 'Starting material: 300mm ultra-pure Silicon wafer' },
  { icon: Zap, label: 'Photolithography', desc: 'Patterning using UV light and photoresist' },
  { icon: Scissors, label: 'Etching', desc: 'Selective removal of material to define features' },
  { icon: Zap, label: 'Ion Implantation', desc: 'Doping regions to create P/N junctions' },
  { icon: Layers, label: 'Deposition', desc: 'Adding layers of metal, oxide, or polysilicon' },
  { icon: Waves, label: 'CMP', desc: 'Chemical Mechanical Polishing — flattening the surface' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const layerVariants: Variants = {
  hidden: { opacity: 0, scaleX: 0.85, y: 12 },
  visible: { opacity: 1, scaleX: 1, y: 0, transition: { duration: 0.35 } },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export function FabricationPhase() {
  return (
    <div className="flex flex-col gap-5 h-full overflow-auto">
      <div className="flex items-center gap-2">
        <Factory className="w-4 h-4 text-cyan-400" />
        <span className="text-zinc-300 text-sm font-medium font-mono">Fabrication Process</span>
        <span className="text-zinc-600 text-xs font-mono ml-auto">CMOS 7nm Node</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Layer stack */}
        <div className="flex flex-col gap-2">
          <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">Process Stack</span>
          <motion.div
            className="flex flex-col gap-1"
            style={{ perspective: '600px' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {PROCESS_LAYERS.map((layer, i) => (
              <motion.div
                key={layer.name}
                variants={layerVariants}
                className="group relative flex items-center gap-3 px-4 py-2.5 rounded cursor-default"
                style={{
                  background: layer.color,
                  border: `1px solid ${layer.stroke}`,
                  transform: `rotateX(${i === 0 ? 0 : -2}deg)`,
                }}
              >
                <span className="text-xs font-mono font-semibold" style={{ color: layer.stroke }}>
                  {layer.name}
                </span>
                {/* Tooltip on hover */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-10 hidden group-hover:block w-56 bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-400 font-mono shadow-xl pointer-events-none">
                  {layer.description}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Process steps */}
        <div className="flex flex-col gap-2">
          <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">Key Process Steps</span>
          <motion.div
            className="flex flex-col gap-2.5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {PROCESS_STEPS.map(({ icon: Icon, label, desc }) => (
              <motion.div
                key={label}
                variants={stepVariants}
                className="flex gap-3 p-2 rounded-md border border-zinc-800 bg-zinc-900/50"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded bg-zinc-800 shrink-0">
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-zinc-300 text-[11px] font-semibold font-mono leading-tight mb-0.5">{label}</div>
                  <div className="text-zinc-500 text-[10px] leading-tight">{desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Fun fact */}
          <div className="mt-2 p-3 rounded-md border border-cyan-500/20 bg-cyan-500/5">
            <div className="text-cyan-400 text-xs font-mono font-semibold mb-1">Chip Facts</div>
            <ul className="text-zinc-400 text-xs space-y-1">
              <li>• A 7nm transistor is ~1000× smaller than a human hair</li>
              <li>• Modern chips have billions of transistors per mm²</li>
              <li>• Fabrication takes 3–4 months in a cleanroom</li>
              <li>• Silicon wafers are 300mm diameter, 99.9999% pure</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
