export const PENDING_EXPIRY_SECONDS = 900

export function isBookingExpired(booking) {
    if (booking.status !== 'pending' || !booking.createdAt) return false
    const diffInSeconds = (new Date() - booking.createdAt.toDate()) / 1000
    return diffInSeconds > PENDING_EXPIRY_SECONDS
}

export function getPriceForHour(hour, court, defaultPricing) {
    if (!court) return 0
    const courtPricing = court.pricing
    if (courtPricing && courtPricing.length > 0) {
        const rule = courtPricing.find((p) => hour >= p.start && hour < p.end)
        if (rule) return rule.rate
    }
    const defaultRule = (defaultPricing || []).find((p) => hour >= p.start && hour < p.end)
    return defaultRule ? defaultRule.rate : 0
}
