export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatJam(isoDateString: string): string {
  return new Date(isoDateString).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function logModuleError(module: string, fn: string, msg: string): void {
  console.error(`[Module:${module}] Error in ${fn}: ${msg}`);
}
