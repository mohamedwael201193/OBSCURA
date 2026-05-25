const TICK_COUNT = 52;

function RulerTicks({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`absolute top-3 bottom-3 flex w-[18px] flex-col justify-between ${
        side === "left" ? "left-0" : "right-0"
      }`}
      aria-hidden
    >
      {Array.from({ length: TICK_COUNT }).map((_, i) => (
        <div
          key={i}
          className={`h-px shrink-0 bg-forest ${side === "left" ? "" : "ml-auto"} ${
            i % 5 === 0 ? "w-[18px]" : "w-2.5"
          }`}
        />
      ))}
    </div>
  );
}

function RulerPointer({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 ${
        side === "left" ? "left-4" : "right-4"
      }`}
      aria-hidden
    >
      <div
        className={`h-0 w-0 border-y-[6px] border-y-transparent ${
          side === "left"
            ? "border-l-[8px] border-l-forest"
            : "border-r-[8px] border-r-forest"
        }`}
      />
    </div>
  );
}

/** Spade-style rulers pinned to the hero container edges (viewport band). */
export default function SideRulers() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 max-lg:hidden" aria-hidden>
      <RulerTicks side="left" />
      <RulerTicks side="right" />
      <RulerPointer side="left" />
      <RulerPointer side="right" />
    </div>
  );
}
