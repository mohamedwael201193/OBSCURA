import { motion } from "framer-motion";

const tickerData = [
  { symbol: "$OBS", price: "██████", change: "ENCRYPTED", up: true },
  { symbol: "FHE", status: "ACTIVE", change: "CoFHE v2", up: true },
  { symbol: "PAY", txns: "████", change: "CONFIDENTIAL", up: true },
  { symbol: "VAULT", price: "LOCKED", change: "Wave 3", up: false },
  { symbol: "VOTE", tally: "███", change: "Wave 2", up: false },
  { symbol: "TRUST", status: "SEALED", change: "Wave 4", up: false },
];

const DataTicker = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-sm p-4 w-[340px] border-glow"
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          Encrypted Assets
        </span>
        <span className="text-[10px] text-primary font-mono animate-[blink_1.5s_ease-in-out_infinite]">
          ● LIVE
        </span>
      </div>

      <div className="space-y-1">
        {tickerData.map((item, i) => (
          <motion.div
            key={item.symbol}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
            className="flex items-center justify-between py-1.5 px-2 hover:bg-secondary/50 transition-colors rounded-sm group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-display tracking-wider text-foreground">
                {item.symbol}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground">
                {item.price || item.status || item.txns}
              </span>
              <span
                className={`text-[10px] font-mono ${
                  item.up ? "text-primary" : "text-muted-foreground/50"
                }`}
              >
                {item.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mini chart placeholder */}
      <div className="mt-3 pt-3 border-t border-border/50">
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
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-muted-foreground font-mono">
            CIPHERTEXT VOL.
          </span>
          <span className="text-[8px] text-primary font-mono">24H</span>
        </div>
      </div>
    </motion.div>
  );
};

export default DataTicker;
