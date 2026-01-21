
// Palette of visually distinct, pleasant colors for calendar events
const EVENT_COLORS = [
    '#3B82F6', // Blue 500
    '#10B981', // Emerald 500
    '#F59E0B', // Amber 500
    '#EF4444', // Red 500
    '#8B5CF6', // Violet 500
    '#EC4899', // Pink 500
    '#06B6D4', // Cyan 500
    '#F97316', // Orange 500
    '#6366F1', // Indigo 500
    '#14B8A6', // Teal 500
    '#D946EF', // Fuchsia 500
    '#84CC16', // Lime 500
];

export function getContractColor(contractId: string): string {
    if (!contractId) return EVENT_COLORS[0];

    // Simple hash function to get a deterministic index
    let hash = 0;
    for (let i = 0; i < contractId.length; i++) {
        hash = contractId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Ensure positive index
    const index = Math.abs(hash) % EVENT_COLORS.length;

    return EVENT_COLORS[index];
}
