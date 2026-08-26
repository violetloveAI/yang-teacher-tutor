export function openAppleMaps(address: string) {
  if (!address.trim()) return false;
  window.location.href = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
  return true;
}
export function callPhone(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, '');
  if (!normalized) return false;
  window.location.href = `tel:${normalized}`;
  return true;
}
