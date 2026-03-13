import { motion } from "framer-motion";
import { Banknote, Landmark, Vote as VoteIcon } from "lucide-react";

function CornerBracket({ className }: { className?: string }) {
  return (
    <svg className={className} width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
      <path d="M0 3V0H3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function ReceiptCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative w-[min(46vw,200px)] border border-forest/25 bg-sage-1/90 px-4 py-3 backdrop-blur-[1px] sm:w-[200px]">
      <CornerBracket className="absolute left-0 top-0 text-forest/45" />
      <CornerBracket className="absolute bottom-0 right-0 rotate-180 text-forest/45" />
      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-forest/48 sm:text-[9px]">
        {label}
      </p>
      <div className="mt-1 font-mono text-[11px] leading-snug text-forest sm:text-[12px]">{children}</div>
    </div>
  );
}

/** Module activity card — matches receipt cards (brackets, sage, forest, mono) */
function ModuleSignalCard({
  module,
  title,
  detail,
  status,
  icon,
  featured,
}: {
  module: string;
  title: string;
  detail: string;
  status: React.ReactNode;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative border border-forest/25 bg-white/95 px-3 py-2.5 shadow-[0_6px_24px_rgba(24,40,14,0.07)] backdrop-blur-sm sm:px-3.5 sm:py-3 ${
        featured ? "w-[min(52vw,228px)] sm:w-[236px]" : "w-[min(48vw,210px)] sm:w-[214px]"
      }`}
    >
      <CornerBracket className="absolute left-0 top-0 text-forest/40" />
      <CornerBracket className="absolute bottom-0 right-0 rotate-180 text-forest/40" />

      <div className="flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-forest/12 bg-sage-2 text-forest">
          {icon}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-forest/42">
            ▸ {module}
          </p>
          <p className="truncate font-display text-[13px] leading-tight text-forest sm:text-[14px]">
            {title}
          </p>
          <p className="truncate font-mono text-[9px] text-forest/45 sm:text-[10px]">{detail}</p>
        </div>
        <div className="shrink-0 text-right font-mono text-[10px] leading-none text-forest/70 sm:text-[11px]">
          {status}
        </div>
      </div>
    </div>
  );
}

function Floater({
  children,
  className,
  delay,
  from = "left",
  hideBelow,
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
  from?: "left" | "right";
  hideBelow?: "sm" | "md" | "never";
}) {
  const hide =
    hideBelow === "md" ? "hidden md:block" : hideBelow === "sm" ? "hidden sm:block" : "block";

  return (
    <motion.div
      className={`absolute z-20 ${hide} ${className}`}
      initial={{ opacity: 0, x: from === "left" ? -10 : 10, y: 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.75, delay }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4.8 + delay, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function WideLayout() {
  return (
    <>
      <Floater delay={0.25} from="left" className="left-0 top-[22%] lg:left-[2%] xl:left-[4%]">
        <ReceiptCard label="TRANSACTION ID">0x8a91…f2c4</ReceiptCard>
      </Floater>

      <Floater delay={0.4} from="left" className="left-0 top-[48%] lg:left-[2%] xl:left-[4%]">
        <ReceiptCard label="ENCRYPTED AMOUNT">
          <span className="tracking-[0.26em] text-lime-accent/80">• • • • • • •</span>
        </ReceiptCard>
      </Floater>

      <Floater
        delay={0.55}
        from="left"
        className="bottom-[18%] left-0 lg:left-[2%] xl:left-[4%]"
        hideBelow="lg"
      >
        <ReceiptCard label="VIEW PERMIT">
          <span className="whitespace-pre-line text-[10px]">
            {"EIP-712 · Signed\nViewer: 0xAa…7b · 5m"}
          </span>
        </ReceiptCard>
      </Floater>

      <Floater delay={0.3} from="right" className="right-0 top-[14%] z-30 lg:right-[2%] xl:right-[4%]">
        <ModuleSignalCard
          featured
          module="ObscuraPay"
          title="Payroll stream"
          detail="ocUSDC · cycle sealed"
          status={<span className="tracking-[0.2em] text-lime-accent/75">████</span>}
          icon={<Banknote className="size-4 stroke-[1.5]" />}
        />
      </Floater>

      <Floater delay={0.45} from="right" className="right-0 top-[44%] lg:right-[3%] xl:right-[5%]" hideBelow="md">
        <ModuleSignalCard
          module="ObscuraCredit"
          title="Vault position"
          detail="Health · FHE compute"
          status={
            <span className="flex gap-0.5 text-forest/35" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="size-1.5 rounded-full bg-forest/25" />
              ))}
            </span>
          }
          icon={<Landmark className="size-4 stroke-[1.5]" />}
        />
      </Floater>

      <Floater delay={0.6} from="right" className="bottom-[20%] right-0 lg:right-[2%] xl:right-[4%]" hideBelow="md">
        <ModuleSignalCard
          module="ObscuraVote"
          title="Proposal #014"
          detail="Ballot · homomorphic"
          status={<span className="text-lime-accent">✓</span>}
          icon={<VoteIcon className="size-4 stroke-[1.5]" />}
        />
      </Floater>
    </>
  );
}

type FloatingDataCardsProps = {
  variant?: "centered" | "wide";
};

export default function FloatingDataCards({ variant = "wide" }: FloatingDataCardsProps) {
  void variant;
  return <WideLayout />;
}
