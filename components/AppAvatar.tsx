const AVATAR_COLORS = ["#6366F1", "#F97316", "#10B981", "#0EA5E9", "#F43F5E", "#8B5CF6", "#EAB308", "#14B8A6"];

/** Square app monogram. Fixed size, never shrinks, letter optically centered via cap-height trimming. */
export default function AppAvatar({ name, size = 20 }: { name: string; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const initials = name.replace(/^Example\s+/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className="flex shrink-0 select-none items-center justify-center font-semibold leading-none text-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        background: color,
        fontSize: Math.round(size * (initials.length > 1 ? 0.4 : 0.5)),
        letterSpacing: initials.length > 1 ? "-0.02em" : undefined,
      }}
    >
      {/* trim to cap height so the glyph box == visible letter, giving true optical centering */}
      <span className="block [text-box:trim-both_cap_alphabetic]">{initials || "?"}</span>
    </span>
  );
}
