const LOGOS = [
  "Fhenix",
  "Arbitrum",
  "FHE",
  "Sepolia",
  "Dynamic",
  "RainbowKit",
  "Fhenix",
  "Arbitrum",
  "FHE",
  "Sepolia",
  "Dynamic",
  "RainbowKit",
];

export default function LogoTicker() {
  return (
    <section className="border-y border-forest/5 bg-white py-12 md:py-16">
      <p className="mb-8 text-center font-spadeBody text-xs uppercase tracking-[0.15em] text-forest/45">
        Powering private payments, governance, and AI across Arbitrum
      </p>
      <div className="overflow-hidden">
        <div className="marquee-track flex w-max animate-marquee items-center gap-16 px-8">
          {LOGOS.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 font-spadeDisplay text-lg font-semibold tracking-tight text-forest/25 grayscale transition-colors hover:text-forest/50"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
