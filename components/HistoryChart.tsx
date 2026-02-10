

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Measurement } from '../types';
import { formatDate, formatDateTime, formatNumber, getStatus } from '../utils';

interface Props {
  measurements: Measurement[];
  minRef: number;
  maxRef: number;
  unit: string;
  displayMin?: number;
  displayMax?: number;
}

const HistoryChart: React.FC<Props> = ({ measurements, minRef, maxRef, unit, displayMin, displayMax }) => {
  const chartData = useMemo(() => {
    const sorted = [...measurements]
      .map((m) => {
        const t = new Date(m.date).getTime();
        return Number.isFinite(t) ? { ...m, t } : null;
      })
      .filter(Boolean) as Array<Measurement & { t: number }>;

    sorted.sort((a, b) => a.t - b.t);
    return sorted;
  }, [measurements]);

  const domains = useMemo(() => {
    const dataVals = chartData.map((d) => d.value).filter((v) => Number.isFinite(v));
    
    // Determine Y-Axis Domain
    // 1. Start with the "Visual Display" range (e.g. 0-40 for Testosterone) if available.
    //    If not available, fallback to ref range (+ padding later).
    let yMin = typeof displayMin === 'number' ? displayMin : minRef;
    let yMax = typeof displayMax === 'number' ? displayMax : maxRef;

    // 2. Expand if actual data points (or ref range) are outside the display range.
    if (dataVals.length > 0) {
      yMin = Math.min(yMin, ...dataVals);
      yMax = Math.max(yMax, ...dataVals);
    }
    
    // Ensure ref range is always visible (though displayMin/Max usually cover this)
    yMin = Math.min(yMin, minRef);
    yMax = Math.max(yMax, maxRef);

    // 3. Fallback auto-padding only if we didn't have display ranges and the range is tight
    if (typeof displayMin !== 'number' && typeof displayMax !== 'number') {
        const range = yMax - yMin;
        if (range === 0) {
           yMin = yMin === 0 ? 0 : yMin * 0.9;
           yMax = yMax === 0 ? 1 : yMax * 1.1;
        } else {
           const pad = range * 0.15;
           yMin -= pad;
           yMax += pad;
        }
    }

    // 4. Hard clamp to 0 for biological plausibility (unless displayMin was explicitly negative, which is rare)
    // We only clamp if displayMin wasn't provided or if it's >= 0.
    if ((typeof displayMin !== 'number' || displayMin >= 0) && yMin < 0) {
        yMin = 0;
    }

    // 5. Ensure we have a valid range
    if (yMin >= yMax) {
       yMax = yMin + 1;
    }

    // X-Axis Domain
    let xMin = chartData[0]?.t ?? 0;
    let xMax = chartData[chartData.length - 1]?.t ?? 1;

    if (xMin === xMax) {
      xMin -= 24 * 60 * 60 * 1000; // -1 day
      xMax += 24 * 60 * 60 * 1000; // +1 day
    }

    return { y: [yMin, yMax] as [number, number], x: [xMin, xMax] as [number, number] };
  }, [chartData, minRef, maxRef, displayMin, displayMax]);

  const tickFormatter = (t: number) => {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE', { month: 'short', day: 'numeric' }).format(d);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload as (Measurement & { t?: number }) | undefined;
    if (!p) return null;

    const status = getStatus(p.value, minRef, maxRef);

    return (
      <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs max-w-[280px] z-50">
        <div className="font-bold">{p.date ? formatDateTime(p.date) : ''}</div>

        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-emerald-200 font-bold text-sm">
            {formatNumber(p.value)} {unit}
          </div>
          <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10">
            {status === 'normal' ? 'Inom ref' : status === 'high' ? 'Över ref' : 'Under ref'}
          </div>
          {p.note ? (
            <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-100">
              📝 not
            </div>
          ) : null}
        </div>

        {p.note ? (
          <div className="mt-2 text-slate-200 whitespace-pre-wrap">
            <span className="text-slate-300 font-semibold">Anteckning:</span> {p.note}
          </div>
        ) : null}
      </div>
    );
  };

  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return null;

    const v = payload.value as number;
    const note = payload.note as string | undefined;
    const status = getStatus(v, minRef, maxRef);

    const fill = status === 'normal' ? '#0f172a' : '#e11d48'; // slate-900 vs rose-600
    const innerR = status === 'normal' ? 4 : 5;

    return (
      <g>
        {/* “note ring” */}
        {note ? (
          <circle cx={cx} cy={cy} r={innerR + 3} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.95} />
        ) : null}

        {/* main dot */}
        <circle cx={cx} cy={cy} r={innerR} fill={fill} stroke="#ffffff" strokeWidth={2} />
      </g>
    );
  };

  if (!chartData.length) {
    return <div className="w-full h-56 flex items-center justify-center text-sm text-slate-600">Ingen historik ännu.</div>;
  }

  const { y: [minY, maxY] } = domains;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 16, right: 18, left: 6, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

          <XAxis
            dataKey="t"
            type="number"
            domain={domains.x as any}
            tickFormatter={tickFormatter}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            scale="time"
          />

          <YAxis
            domain={domains.y as any}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(v: any) => formatNumber(Number(v), 0)} // No decimals on axis for cleaner look
            allowDecimals={false} // Force integers on Y-axis if possible
          />

          <Tooltip content={<CustomTooltip />} />

          {/* High danger zone */}
          <ReferenceArea y1={maxRef} y2={maxY} fill="#fecaca" fillOpacity={0.4} stroke="none" />
          
          {/* Low danger zone */}
          <ReferenceArea y1={minY} y2={minRef} fill="#fecaca" fillOpacity={0.4} stroke="none" />
          
          {/* Ref range background */}
          <ReferenceArea y1={minRef} y2={maxRef} fill="#dcfce7" fillOpacity={0.5} stroke="none" />
          
          {/* Ref lines */}
          <ReferenceLine y={minRef} stroke="#86efac" strokeDasharray="4 4" />
          <ReferenceLine y={maxRef} stroke="#86efac" strokeDasharray="4 4" />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#0f172a"
            strokeWidth={2}
            dot={renderDot}
            activeDot={{ r: 7, fill: '#0f172a', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
