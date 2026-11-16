export function NicknameInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  describedBy: string;
}) {
  return (
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={20}
      autoComplete="nickname"
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className="min-h-12 w-full rounded-xl border-2 border-tile-edge bg-card px-4 font-game text-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/60 aria-invalid:border-destructive"
    />
  );
}
