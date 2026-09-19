import { useStore } from '@/state/store';

export function Notices() {
  const notices = useStore((s) => s.notices);
  return (
    <div className="notices" aria-live="polite">
      {notices.map((n) => (
        <div key={n.id} className={`notice ${n.kind}`}>
          <div className="t">{n.title}</div>
          {n.lines?.map((l, i) => (
            <div key={i} className="l">{l}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
