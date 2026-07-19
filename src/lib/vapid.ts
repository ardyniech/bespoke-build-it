// Public VAPID key — safe to expose in browser.
export const VAPID_PUBLIC_KEY =
  "BPZaaoPwqRhGX91t2kEkBjsOoDnr2op2tfywUk50lswIsumNJUxoZ3kLUx2p24Tkyd9nN3XYnHh6ehb1h5iVMRg";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}