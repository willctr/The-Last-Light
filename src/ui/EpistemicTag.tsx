import { epistemicTier, type EpistemicStatus, type FactorValue } from '@/data/types';
import type { PropulsionStatus } from '@/science/transfer';

const STATUS_LABEL: Record<EpistemicStatus, string> = {
  OBSERVED: 'Observed',
  MEASURED: 'Measured',
  STRONGLY_SUPPORTED: 'Strongly supported',
  INFERRED: 'Inferred',
  POSSIBLE: 'Possible',
  HYPOTHETICAL: 'Hypothetical',
  SPECULATIVE: 'Speculative',
  FICTIONAL_VISUALIZATION: 'Fictional visualization',
};

/** Colour + text label for an epistemic status. Meaning never relies on colour alone. */
export function EpistemicTag({ status }: { status: EpistemicStatus }) {
  const tier = epistemicTier(status).toLowerCase();
  return (
    <span className={`tag ${tier}`} title={`${STATUS_LABEL[status]} — ${tier === 'established' ? 'established / observed' : tier === 'plausible' ? 'scientifically plausible but uncertain' : 'hypothetical / speculative'}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const FACTOR_LABEL: Record<FactorValue, string> = {
  CONFIRMED: 'Confirmed',
  LIKELY: 'Likely',
  POSSIBLE: 'Possible',
  UNKNOWN: 'Unknown',
  UNFAVORABLE: 'Unfavourable',
  NOT_DETECTED: 'Not detected',
};

export function FactorTag({ value }: { value: FactorValue }) {
  return <span className={`tag ${value.toLowerCase()}`}>{FACTOR_LABEL[value]}</span>;
}

export function PropulsionTag({ status }: { status: PropulsionStatus }) {
  return <span className={`tag ${status.toLowerCase()}`}>{status}</span>;
}

export function EpistemicLegend() {
  return (
    <div className="btn-row" style={{ gap: 8 }}>
      <span className="tag established">Established</span>
      <span className="tag plausible">Plausible · uncertain</span>
      <span className="tag speculative">Hypothetical · speculative</span>
    </div>
  );
}
