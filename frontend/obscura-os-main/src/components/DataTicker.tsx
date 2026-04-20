import { motion } from "framer-motion";

const tickerData = [
  { symbol: "cUSDC", status: "ENCRYPTED", label: "Confidential USDC", up: true },
  { symbol: "PAY", status: "ACTIVE", label: "Transfers & Payroll", up: true },
  { symbol: "ESCROW", status: "ACTIVE", label: "Encrypted Escrows", up: true },
  { symbol: "STREAM", status: "ACTIVE", label: "Payroll Streams", up: true },
  { symbol: "VOTE", status: "ACTIVE", label: "Encrypted Governance", up: true },
  { symbol: "STEALTH", status: "ACTIVE", label: "Stealth Addresses", up: true },
];

const DataTicker = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-lg p-5 w-[360px] border-glow"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
        <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">
          System Status
        </span>
        <span className="text-xs text-primary animate-[blink_1.5s_ease-in-out_infinite] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          LIVE
        </span>
      </div>

      <div className="space-y-1">
        {tickerData.map((item, i) => (
          <motion.div
            key={item.symbol}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
            className="flex items-center justify-between py-2 px-3 hover:bg-white/[0.02] transition-colors rounded-md group"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-display font-semibold tracking-wide text-foreground">
                {item.symbol}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
            </div>
            <span className="text-xs font-mono text-primary">
              {item.status}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Mini chart placeholder */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <div className="flex items-end gap-[2px] h-8">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/30 rounded-t-sm transition-all"
              style={{
                height: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.7,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-muted-foreground">
            FHE Operations
          </span>
          <span className="text-[11px] text-primary font-mono">24H</span>
        </div>
      </div>
    </motion.div>
  );
};

export default DataTicker;
