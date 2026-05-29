import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Trash2,
  Timer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAccount, useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { useIsArbitrumSepolia } from "@/hooks/useWalletSessionChainId";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS, OBSCURA_TOKEN_ABI, OBSCURA_TOKEN_ADDRESS } from "@/config/contracts";
import { CATEGORY_LABELS } from "@/hooks/useProposals";
import { arbitrumSepolia } from "viem/chains";
import { useChainTime } from "@/hooks/useChainTime";
import {
  VoteFormField,
  VotePanelHeader,
  VoteWizardSteps,
  vh,
} from "@/components/harmony/voteHarmonyUi";

const TEMPLATES = [
  { label: "Yes / No", options: ["Yes", "No"] },
  { label: "Approve / Reject / Abstain", options: ["Approve", "Reject", "Abstain"] },
  { label: "Custom", options: [] },
];

const TITLE_MAX = 120;
const DESC_MAX = 500;

const DURATION_PRESETS = [
  { label: "10 min", seconds: 600 },
  { label: "1 hour", seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
  { label: "30 days", seconds: 2592000 },
  { label: "Custom", seconds: 0 },
];

const WIZARD_STEPS = [
  { id: "basics", label: "Basics", description: "Title and context" },
  { id: "choices", label: "Choices", description: "Two to ten options" },
  { id: "schedule", label: "Schedule", description: "Duration and quorum" },
  { id: "review", label: "Review", description: "Confirm and publish" },
];

function formatWriteError(error: unknown, fallback: string): string {
  const txError = error as { shortMessage?: string; message?: string };
  return txError.shortMessage ?? txError.message ?? fallback;
}

interface CreateProposalFormProps {
  onSuccess?: () => void;
  embedded?: boolean;
}

export default function CreateProposalForm({ onSuccess, embedded = false }: CreateProposalFormProps) {
  const { address, isConnected } = useAccount();
  const { isWrongNetwork, sessionChainId } = useIsArbitrumSepolia();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: lastClaimRaw } = useReadContract({
    address: OBSCURA_TOKEN_ADDRESS,
    abi: OBSCURA_TOKEN_ABI,
    functionName: "lastClaim",
    args: address ? [address] : undefined,
    query: { enabled: !!OBSCURA_TOKEN_ADDRESS && !!address },
  });
  const hasClaimed = Number(lastClaimRaw ?? 0) > 0;

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["Yes", "No"]);
  const [newOption, setNewOption] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [customDeadline, setCustomDeadline] = useState("");
  const [quorum, setQuorum] = useState("0");
  const [category, setCategory] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const chainNow = useChainTime();

  useEffect(() => {
    if (selectedDuration === DURATION_PRESETS.length - 1) {
      const chainTimeMs = Number(chainNow) * 1000 + 24 * 3600 * 1000;
      const d = new Date(chainTimeMs);
      const pad = (n: number) => n.toString().padStart(2, "0");
      setCustomDeadline(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDuration]);

  function applyTemplate(idx: number) {
    setSelectedTemplate(idx);
    const t = TEMPLATES[idx];
    if (t.options.length > 0) setOptions([...t.options]);
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
    if (!customDeadline) return 0n;
    const [datePart, timePart = "00:00"] = customDeadline.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    const localDate = new Date(year, month - 1, day, hour, minute);
    return BigInt(Math.floor(localDate.getTime() / 1000));
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (!title.trim()) return "Title is required";
      if (title.length > TITLE_MAX) return `Title too long (max ${TITLE_MAX} characters)`;
      if (description.length > DESC_MAX) return `Description too long (max ${DESC_MAX} characters)`;
    }
    if (current === 1) {
      if (options.length < 2) return "At least 2 options required";
      if (options.some((o) => !o.trim())) return "All options must have text";
    }
    if (current === 2) {
      const deadlineUnix = getDeadlineUnix();
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (deadlineUnix <= now) return "Deadline must be in the future";
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    const validationError = validateStep(0) ?? validateStep(1) ?? validateStep(2);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isWrongNetwork) {
      setError(`Switch your wallet to Arbitrum Sepolia (421614). Current chain: ${sessionChainId ?? "unknown"}.`);
      return;
    }

    const deadlineUnix = getDeadlineUnix();

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
          options.map((o) => o.trim()),
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

      setIsConfirming(true);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Proposal creation transaction reverted");
      }

      setTxHash(hash);
      setTitle("");
      setDescription("");
      setOptions(["Yes", "No"]);
      setSelectedTemplate(0);
      setQuorum("0");
      setStep(0);
      window.setTimeout(() => onSuccess?.(), 1200);
    } catch (err: unknown) {
      setError(formatWriteError(err, "Failed to create proposal"));
    } finally {
      setIsConfirming(false);
    }
  }

  const deadlinePreview = getDeadlineUnix();
  const durationLabel = DURATION_PRESETS[selectedDuration].label;

  return (
    <div className="space-y-5">
      {!embedded && (
        <VotePanelHeader
          icon={Plus}
          title="Create private proposal"
          subtitle="Guided setup — voters see choices, not individual ballots"
          badge="Private"
        />
      )}

      <VoteWizardSteps steps={WIZARD_STEPS} current={step} />

      <form onSubmit={step === WIZARD_STEPS.length - 1 ? handleSubmit : (e) => e.preventDefault()} className="space-y-5">
        {isConnected && !hasClaimed && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
            <div>
              <p className="text-sm font-semibold text-amber-950">Beta access required</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                Unlock beta access in Pay with one faucet claim, then return here to create a proposal.
              </p>
            </div>
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4 rounded-2xl border border-border bg-muted/25 p-4 sm:p-5">
            <VoteFormField label="Start from a template" hint="Pick a common format or customize later.">
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => applyTemplate(i)}
                    className={`min-h-[40px] rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                      selectedTemplate === i
                        ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--accent))]/12 text-foreground"
                        : "hairline text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </VoteFormField>

            <VoteFormField label="Proposal title" hint="Clear, judge-friendly — what are voters deciding?">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fund the next private beta improvement"
                className={vh.input}
                maxLength={TITLE_MAX}
              />
              <div className="flex justify-end">
                <span className={`text-[10px] tabular-nums ${title.length > TITLE_MAX * 0.9 ? "text-amber-700" : "text-muted-foreground"}`}>
                  {title.length} / {TITLE_MAX}
                </span>
              </div>
            </VoteFormField>

            <VoteFormField label="Description" hint="Optional context voters will see before casting.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the tradeoffs, timeline, or scope…"
                rows={3}
                className={`${vh.input} resize-none`}
                maxLength={DESC_MAX}
              />
              <div className="flex justify-end">
                <span className={`text-[10px] tabular-nums ${description.length > DESC_MAX * 0.9 ? "text-amber-700" : "text-muted-foreground"}`}>
                  {description.length} / {DESC_MAX}
                </span>
              </div>
            </VoteFormField>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-border bg-muted/25 p-4 sm:p-5">
            <VoteFormField label={`Voting choices (${options.length}/10)`} hint="Voters pick exactly one option. Ballots stay private.">
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const updated = [...options];
                        updated[i] = e.target.value;
                        setOptions(updated);
                        setSelectedTemplate(2);
                      }}
                      className={`${vh.input} py-2`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hairline text-muted-foreground hover:text-destructive"
                        aria-label={`Remove option ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 10 && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                    placeholder="Add another option…"
                    className={`${vh.input} py-2`}
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="shrink-0 rounded-full hairline px-4 text-sm font-medium hover:bg-muted/60"
                  >
                    Add
                  </button>
                </div>
              )}
            </VoteFormField>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-2xl border border-border bg-muted/25 p-4 sm:p-5">
            <VoteFormField label="Category">
              <select value={category} onChange={(e) => setCategory(Number(e.target.value))} className="pay-select">
                {CATEGORY_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </VoteFormField>

            <VoteFormField label="Voting duration" hint="How long voters have to cast or change their ballot.">
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((d, i) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setSelectedDuration(i)}
                    className={`min-h-[40px] rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                      selectedDuration === i
                        ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--accent))]/12 text-foreground"
                        : "hairline text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
                  className={`${vh.input} mt-2`}
                />
              )}
            </VoteFormField>

            <VoteFormField label="Quorum" hint="Minimum voters required (0 = no quorum).">
              <input
                type="number"
                min="0"
                value={quorum}
                onChange={(e) => setQuorum(e.target.value)}
                className={vh.input}
              />
            </VoteFormField>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <p className="text-sm font-medium text-foreground">Review before publishing</p>
            <dl className="space-y-3 text-sm">
              <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Title</dt>
                <dd className="mt-1 font-medium text-foreground">{title.trim() || "—"}</dd>
              </div>
              {description.trim() && (
                <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Description</dt>
                  <dd className="mt-1 text-muted-foreground">{description.trim()}</dd>
                </div>
              )}
              <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Choices</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {options.map((o, i) => (
                    <span key={i} className="rounded-full hairline bg-background px-2.5 py-0.5 text-xs">
                      {o}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Category</dt>
                  <dd className="mt-1 font-medium">{CATEGORY_LABELS[category]}</dd>
                </div>
                <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Duration</dt>
                  <dd className="mt-1 font-medium">{durationLabel}</dd>
                </div>
                <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Quorum</dt>
                  <dd className="mt-1 font-medium">{quorum || "0"}</dd>
                </div>
              </div>
              {deadlinePreview > 0n && (
                <p className="text-xs text-muted-foreground">
                  Closes {new Date(Number(deadlinePreview) * 1000).toLocaleString()}
                </p>
              )}
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">
              After publishing, voters can cast encrypted ballots until the deadline. Only aggregate totals are revealed at finalization.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {txHash && (
          <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--success))]/25 bg-[hsl(var(--accent))]/10 p-3 text-sm text-foreground">
            <CheckCircle className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
            <span>Proposal confirmed!</span>
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[hsl(var(--success))] hover:underline"
            >
              Arbiscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-full hairline px-5 text-sm font-medium hover:bg-muted/60"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <span />
          )}

          {step < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <motion.button
              type="submit"
              disabled={!isConnected || !hasClaimed || isPending || isConfirming || !OBSCURA_VOTE_ADDRESS || isWrongNetwork}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.99 }}
              className="inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-50 sm:w-auto"
            >
              {!isConnected
                ? "Connect wallet"
                : isWrongNetwork
                  ? "Switch to Arb Sepolia"
                : !hasClaimed
                  ? "Unlock beta access first"
                  : isPending
                    ? "Sign in wallet…"
                    : isConfirming
                      ? "Confirming…"
                      : "Publish proposal"}
            </motion.button>
          )}
        </div>
      </form>
    </div>
  );
}
