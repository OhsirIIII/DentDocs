import React from 'react';

interface FdiDentalChartProps {
  treatedTeeth?: number[];
  missingTeeth?: number[];
  watchTeeth?: number[];
  selectedTeeth?: number[];
  onToothClick?: (toothNumber: number) => void;
  interactive?: boolean;
}

export const FdiDentalChart: React.FC<FdiDentalChartProps> = ({
  treatedTeeth = [],
  missingTeeth = [],
  watchTeeth = [],
  selectedTeeth = [],
  onToothClick,
  interactive = true,
}) => {
  // FDI Quadrants
  // Upper arch: Q1 (18 down to 11) then Q2 (21 up to 28)
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];

  // Lower arch: Q4 (48 down to 41) then Q3 (31 up to 38)
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  const getToothStatus = (num: number) => {
    if (selectedTeeth.includes(num)) return 'selected';
    if (missingTeeth.includes(num)) return 'missing';
    if (watchTeeth.includes(num)) return 'watch';
    if (treatedTeeth.includes(num)) return 'treated';
    return 'sound';
  };

  const renderTooth = (num: number) => {
    const status = getToothStatus(num);
    const isMolar = [18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38].includes(num);
    const isAnterior = [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43].includes(num);

    let style = 'bg-white text-slate-700 border-slate-300 hover:border-teal-500';
    let indicator = null;

    if (status === 'selected') {
      style = 'bg-teal-700 text-white border-teal-700 ring-2 ring-teal-300 font-bold';
    } else if (status === 'missing') {
      style = 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60';
    } else if (status === 'watch') {
      style = 'bg-amber-50 text-amber-900 border-amber-300 font-medium';
      indicator = <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1 right-1" />;
    } else if (status === 'treated') {
      style = 'bg-teal-50 text-teal-800 border-teal-300 font-medium';
      indicator = <span className="w-1.5 h-1.5 rounded-full bg-teal-600 absolute top-1 right-1" />;
    }

    return (
      <button
        key={num}
        type="button"
        disabled={!interactive}
        onClick={() => onToothClick && onToothClick(num)}
        title={`Tooth FDI ${num} - ${status.toUpperCase()} (${
          isMolar ? 'Molar' : isAnterior ? 'Anterior' : 'Premolar'
        })`}
        className={`relative flex flex-col items-center justify-center rounded-md border text-center transition-all ${style} ${
          interactive ? 'cursor-pointer hover:scale-105' : 'cursor-default'
        } ${isMolar ? 'w-8 h-10' : 'w-7 h-10'}`}
      >
        {indicator}
        <span className="text-[10px] font-mono font-bold leading-none">{num}</span>
        <span className="text-[8px] uppercase tracking-tighter opacity-70 mt-1">
          {status === 'missing' ? 'X' : status === 'watch' ? 'Obs' : status === 'treated' ? 'Tx' : '—'}
        </span>
      </button>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-semibold text-slate-800">FDI Two-Digit Charting Matrix</span>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-teal-600 inline-block"></span>
            Treated (Tx)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-500 inline-block"></span>
            Under Observation
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-slate-300 inline-block"></span>
            Missing
          </span>
        </div>
      </div>

      <div className="space-y-3 select-none">
        {/* Upper Arch */}
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase font-mono text-slate-400 mb-1 px-1">
            <span>Maxillary Right (Q1)</span>
            <span>Maxillary Left (Q2)</span>
          </div>
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto pb-1">
            <div className="flex gap-1">{upperRight.map(renderTooth)}</div>
            <div className="w-px h-8 bg-slate-300 mx-1 shrink-0"></div>
            <div className="flex gap-1">{upperLeft.map(renderTooth)}</div>
          </div>
        </div>

        {/* Midline horizontal line */}
        <div className="w-full border-t border-dashed border-slate-200"></div>

        {/* Lower Arch */}
        <div>
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto pb-1">
            <div className="flex gap-1">{lowerRight.map(renderTooth)}</div>
            <div className="w-px h-8 bg-slate-300 mx-1 shrink-0"></div>
            <div className="flex gap-1">{lowerLeft.map(renderTooth)}</div>
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase font-mono text-slate-400 mt-1 px-1">
            <span>Mandibular Right (Q4)</span>
            <span>Mandibular Left (Q3)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
