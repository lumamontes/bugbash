interface Badge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  category: string;
  threshold: number;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
}

const tierColors: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
};

const tierLabels: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
};

export default function BadgeCard({ badge }: { badge: Badge }) {
  const borderColor = badge.earned ? tierColors[badge.tier] || '#6366f1' : '#242430';

  return (
    <div
      className={`relative rounded-xl border-2 p-4 transition-all ${
        badge.earned
          ? 'bg-[#12121a]'
          : 'bg-[#12121a]/50 opacity-60 grayscale'
      }`}
      style={{ borderColor }}
    >
      {/* Tier badge */}
      <span
        className="absolute top-2 right-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
        style={{ backgroundColor: `${tierColors[badge.tier]}20`, color: tierColors[badge.tier] }}
      >
        {tierLabels[badge.tier]}
      </span>

      <div className="text-3xl mb-2">{badge.icon}</div>
      <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">{badge.name}</h3>
      <p className="text-xs text-[#94a3b8]">{badge.description}</p>

      {/* Progress bar for threshold badges */}
      {!badge.earned && badge.threshold > 1 && badge.progress !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-[#64748b] mb-1">
            <span>{badge.progress}/{badge.threshold}</span>
          </div>
          <div className="h-1.5 bg-[#242430] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (badge.progress / badge.threshold) * 100)}%`,
                backgroundColor: tierColors[badge.tier],
              }}
            />
          </div>
        </div>
      )}

      {badge.earned && badge.earnedAt && (
        <p className="text-[10px] text-[#64748b] mt-2">
          {new Date(badge.earnedAt).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  );
}
