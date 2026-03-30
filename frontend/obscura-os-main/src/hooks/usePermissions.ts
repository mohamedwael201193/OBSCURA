import { useReadContract, useWriteContract, useAccount, useConfig, usePublicClient } from 'wagmi';
import { OBSCURA_PAY_ABI, OBSCURA_PAY_ADDRESS } from '@/config/contracts';
import { Role } from '@/lib/constants';
import { arbitrumSepolia } from 'viem/chains';

export function usePermissions() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const contractConfig = {
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
  } as const;

  // Read contract owner
  const { data: ownerAddress } = useReadContract({
    ...contractConfig,
    functionName: 'owner',
    query: { enabled: !!OBSCURA_PAY_ADDRESS },
  });

  // Read connected user's role
  const { data: userRoleRaw } = useReadContract({
    ...contractConfig,
    functionName: 'roles',
    args: address ? [address] : undefined,
    query: { enabled: !!OBSCURA_PAY_ADDRESS && !!address },
  });

  // Check if connected user is an employee
  const { data: isEmployeeResult } = useReadContract({
    ...contractConfig,
    functionName: 'isEmployee',
    args: address ? [address] : undefined,
    query: { enabled: !!OBSCURA_PAY_ADDRESS && !!address },
  });

  const { writeContractAsync: grantRoleAsync, isPending: isGranting } = useWriteContract();
  const { writeContractAsync: revokeRoleAsync, isPending: isRevoking } = useWriteContract();
  const { writeContractAsync: grantAuditAsync, isPending: isGrantingAudit } = useWriteContract();

  const isOwner = !!address && !!ownerAddress && address.toLowerCase() === (ownerAddress as string).toLowerCase();
  const userRole = (userRoleRaw as number) ?? Role.NONE;
  const isEmployee = isEmployeeResult as boolean ?? false;
  const isAuditor = userRole === Role.AUDITOR;
  const isAdmin = userRole === Role.ADMIN || isOwner;

  async function grantRole(user: `0x${string}`, role: Role) {
    if (!OBSCURA_PAY_ADDRESS || !address) throw new Error('Contract not configured');
    const feeData = await publicClient!.estimateFeesPerGas();
    const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n) / 100n : undefined;
    return grantRoleAsync({
      address: OBSCURA_PAY_ADDRESS,
      abi: OBSCURA_PAY_ABI,
      functionName: 'grantRole',
      args: [user, role],
      account: address,
      chain: arbitrumSepolia,
      maxFeePerGas,
      gas: 150_000n,
    });
  }

  async function revokeRole(user: `0x${string}`) {
    if (!OBSCURA_PAY_ADDRESS || !address) throw new Error('Contract not configured');
    const feeData = await publicClient!.estimateFeesPerGas();
    const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n) / 100n : undefined;
    return revokeRoleAsync({
      address: OBSCURA_PAY_ADDRESS,
      abi: OBSCURA_PAY_ABI,
      functionName: 'revokeRole',
      args: [user],
      account: address,
      chain: arbitrumSepolia,
      maxFeePerGas,
      gas: 150_000n,
    });
  }

  async function grantAuditAccess(auditor: `0x${string}`) {
    if (!OBSCURA_PAY_ADDRESS || !address) throw new Error('Contract not configured');
    const feeData = await publicClient!.estimateFeesPerGas();
    const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n) / 100n : undefined;
    return grantAuditAsync({
      address: OBSCURA_PAY_ADDRESS,
      abi: OBSCURA_PAY_ABI,
      functionName: 'grantAuditAccess',
      args: [auditor],
      account: address,
      chain: arbitrumSepolia,
      maxFeePerGas,
      gas: 200_000n,
    });
  }

  return {
    ownerAddress: ownerAddress as `0x${string}` | undefined,
    userRole,
    isOwner,
    isEmployee,
    isAuditor,
    isAdmin,
    grantRole,
    revokeRole,
    grantAuditAccess,
    isGranting,
    isRevoking,
    isGrantingAudit,
  };
}
