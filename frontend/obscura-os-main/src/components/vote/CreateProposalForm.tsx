import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, AlertCircle, CheckCircle, ExternalLink, Trash2, X, Timer } from "lucide-react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import { CATEGORY_LABELS } from "@/hooks/useProposals";
import { arbitrumSepolia } from "viem/chains";

const TEMPLATES = [
  { label: "Yes / No", options: ["Yes", "No"] },
  { label: "Approve / Reject / Abstain", options: ["Approve", "Reject", "Abstain"] },
  { label: "Custom", options: [] },
];

const DURATION_PRESETS = [
  { label: "10 min", seconds: 600 },
  { label: "1 hour", seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
  { label: "30 days", seconds: 2592000 },
  { label: "Custom", seconds: 0 },
];

export default function CreateProposalForm() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["Yes", "No"]);
  const [newOption, setNewOption] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(2); // 24h default
  const [customDeadline, setCustomDeadline] = useState("");
  const [quorum, setQuorum] = useState("0");
  const [category, setCategory] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  function applyTemplate(idx: number) {
    setSelectedTemplate(idx);
    const t = TEMPLATES[idx];
    if (t.options.length > 0) {
      setOptions([...t.options]);
    }
  }

  function addOption() {
    const trimmed = newOption.trim();
    if (!trimmed || options.length >= 10) return;
    setOptions([...options, trimmed]);
    setNewOption("");
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  }

  function getDeadlineUnix(): bigint {
    const preset = DURATION_PRESETS[selectedDuration];
    if (preset.seconds > 0) {
      return BigInt(Math.floor(Date.now() / 1000) + preset.seconds);
    }
    // Custom
    if (!customDeadline) return 0n;
    return BigInt(Math.floor(new Date(customDeadline).getTime() / 1000));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    if (!title.trim()) { setError("Title is required"); return; }
    if (options.length < 2) { setError("At least 2 options required"); return; }
    if (options.some(o => !o.trim())) { setError("All options must have text"); return; }

    const deadlineUnix = getDeadlineUnix();
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (deadlineUnix <= now) { setError("Deadline must be in the future"); return; }

    try {
      const block = await publicClient!.getBlock();
      const baseFee = block.baseFeePerGas ?? 20_000_000n;
      const maxFeePerGas = baseFee * 3n;
      const maxPriorityFeePerGas = baseFee;

      const hash = await writeContractAsync({
        address: OBSCURA_VOTE_ADDRESS!,
        abi: OBSCURA_VOTE_ABI,
        functionName: "createProposal",
        args: [
          title.trim(),
          description.trim(),
          options.map(o => o.trim()),
          deadlineUnix,
          BigInt(quorum || "0"),
          category,
        ],
        account: address,
        chain: arbitrumSepolia,
        gas: 2_000_000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      setTxHash(hash);
      setTitle("");
      setDescription("");
      setOptions(["Yes", "No"]);
      setSelectedTemplate(0);
      setQuorum("0");
    } catch (err: any) {
      setError(err.shortMessage ?? err.message ?? "Failed to create proposal");
    }
  }

  return (
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Create Proposal</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Multi-option encrypted governance</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">FHE</span>
      </div>

      <div className="text-[12px] text-muted-foreground/55 leading-relaxed border-l-2 border-emerald-500/20 pl-3">
        Create a multi-option proposal. Use a template or define custom choices (2–10).
        Set a quorum (0 = no minimum). After the deadline, anyone can finalize to reveal tallies.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template selector */}
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Template
          </label>
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.map((t, i) => (
              <button
                key={t.label}
                type="button"
                onClick={() => applyTemplate(i)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  selectedTemplate === i
                    ? "border-emerald-400/50 text-emerald-400 bg-emerald-400/10"
                    : "border-white/[0.09] text-muted-foreground hover:border-emerald-500/30 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Proposal Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Increase treasury allocation by 10%"
            className="pay-input"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context for voters..."
            rows={2}
            className="pay-input resize-none"
          />
        </div>

        {/* Options */}
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Options ({options.length}/10)
          </label>
          <div className="space-y-1.5">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i}</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const updated = [...options];
                    updated[i] = e.target.value;
                    setOptions(updated);
                    setSelectedTemplate(2); // switch to Custom
                  }}
                  className="pay-input py-1.5"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                placeholder="Add option..."
                className="pay-input py-1.5"
              />
              <button type="button" onClick={addOption} className="text-emerald-400 text-xs hover:underline">
                + Add
              </button>
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(Number(e.target.value))}
            className="pay-select"
          >
            {CATEGORY_LABELS.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
        </div>

        {/* Duration presets */}
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            <Timer className="w-3 h-3 inline mr-1" /> Voting Duration
          </label>
          <div className="flex gap-2 flex-wrap">
            {DURATION_PRESETS.map((d, i) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setSelectedDuration(i)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  selectedDuration === i
                    ? "border-emerald-400/50 text-emerald-400 bg-emerald-400/10"
                    : "border-white/[0.09] text-muted-foreground hover:border-emerald-500/30 hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {selectedDuration === DURATION_PRESETS.length - 1 && (
            <input
              type="datetime-local"
              value={customDeadline}
              onChange={(e) => setCustomDeadline(e.target.value)}
              className="pay-input mt-2"
            />
          )}
        </div>

        {/* Quorum */}
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Quorum (min votes, 0 = none)
          </label>
          <input
            type="number"
            min="0"
            value={quorum}
            onChange={(e) => setQuorum(e.target.value)}
            className="pay-input"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        {txHash && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/20 text-emerald-400 text-xs">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Proposal created!</span>
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto underline inline-flex items-center gap-1 hover:text-emerald-300"
            >
              Arbiscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={!isConnected || isPending || !OBSCURA_VOTE_ADDRESS}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.99 }}
          className="btn-pay btn-pay-emerald w-full py-2.5"
        >
          {isPending ? "Sign in Wallet..." : "Create Proposal"}
        </motion.button>
      </form>
    </div>
  );
}
