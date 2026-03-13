/**
 * NavRightSlot — drop the real WalletConnect widget into GooeyNav's right slot.
 */
import WalletConnect from "@/components/wallet/WalletConnect";

type NavRightSlotProps = {
  tone?: "dark" | "light";
};

export default function NavRightSlot({ tone = "dark" }: NavRightSlotProps) {
  return (
    <div className="flex items-center gap-3">
      <WalletConnect tone={tone} />
    </div>
  );
}
