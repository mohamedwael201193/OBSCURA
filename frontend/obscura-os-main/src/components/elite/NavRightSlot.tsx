/**
 * NavRightSlot — drop the real WalletConnect widget into GooeyNav's right slot.
 * Wraps WalletConnect so it fits the nav height (h-14).
 */
import WalletConnect from "@/components/wallet/WalletConnect";

export default function NavRightSlot() {
  return (
    <div className="flex items-center gap-3">
      <WalletConnect />
    </div>
  );
}
