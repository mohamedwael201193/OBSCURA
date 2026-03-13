import { motion } from "framer-motion";
import { Banknote, Vault, Vote as VoteIcon } from "lucide-react";

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

function MerchantCard({
  name,
  meta,
  trailing,
  accent,
  icon,
  featured,
}: {
  name: string;
  meta: string;
  trailing?: string;
  accent: "emerald" | "violet" | "amber";
  icon: React.ReactNode;
  featured?: boolean;
}) {
  const accentBg = {
    emerald: "bg-emerald-600",
    violet: "bg-violet-600",
    amber: "bg-amber-500",
  }[accent];

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-forest/8 bg-white px-3 py-2 shadow-[0_8px_28px_rgba(24,40,14,0.09)] sm:rounded-2xl sm:px-3.5 sm:py-2.5 ${
        featured ? "w-[min(52vw,228px)] sm:w-[236px]" : "w-[min(48vw,210px)] sm:w-[214px]"
      }`}
    >
      <div className={`flex shrink-0 items-center justify-center rounded-lg text-white ${accentBg} size-9`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[12px] font-medium text-forest sm:text-[13px]">{name}</p>
        <p className="truncate font-mono text-[9px] text-forest/45 sm:text-[10px]">{meta}</p>
      </div>
      {trailing ? (
        <span className="shrink-0 font-display text-base tabular-nums text-forest">{trailing}</span>
      ) : null}
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
          <span className="tracking-[0.26em]">• • • • • • •</span>
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
        <MerchantCard
          featured
          name="Payroll · Acme Labs"
          meta="2026-05-24 · sealed"
          trailing="—————"
          accent="emerald"
          icon={<Banknote className="size-4" />}
        />
      </Floater>

      <Floater delay={0.45} from="right" className="right-0 top-[44%] lg:right-[3%] xl:right-[5%]" hideBelow="md">
        <MerchantCard
          name="Vault · Conservative"
          meta="Health · encrypted"
          trailing="●●●●"
          accent="violet"
          icon={<Vault className="size-4" />}
        />
      </Floater>

      <Floater delay={0.6} from="right" className="bottom-[20%] right-0 lg:right-[2%] xl:right-[4%]" hideBelow="md">
        <MerchantCard
          name="Proposal #014"
          meta="Ballot · sealed"
          trailing="✓"
          accent="amber"
          icon={<VoteIcon className="size-4" />}
        />
      </Floater>
    </>
  );
}

type FloatingDataCardsProps = {
  variant?: "centered" | "wide";
};

export default function FloatingDataCards({ variant = "wide" }: FloatingDataCardsProps) {
  return <WideLayout />;
}
