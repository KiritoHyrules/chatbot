const COUNTRY_DEFAULT = '51'

export type LeadId = string & { __brand: 'LeadId' }

export function normalizeLeadId(rawJid: string): LeadId {
  if (!rawJid || typeof rawJid !== 'string') {
    throw new Error('Invalid JID: empty or non-string')
  }

  if (rawJid.endsWith('@g.us')) {
    throw new Error('Group JIDs not supported as lead_id')
  }

  if (rawJid.endsWith('@lid')) {
    const lid = rawJid.split('@')[0]
    return ('lid:' + lid) as LeadId
  }

  let stripped = rawJid
    .replace(/@s\.whatsapp\.net$/, '')
    .replace(/@c\.us$/, '')
    .replace(/:\d+$/, '')

  const digits = stripped.replace(/\D/g, '')

  let normalized = digits
  if (digits.length === 9 && !digits.startsWith('5')) {
    normalized = COUNTRY_DEFAULT + digits
  }

  if (normalized.length < 10 || normalized.length > 15) {
    throw new Error(`Invalid lead_id length: ${normalized}`)
  }

  return normalized as LeadId
}

export function isResolved(leadId: LeadId): boolean {
  return !leadId.startsWith('lid:')
}

export function resolveLid(leadId: LeadId, phoneNormalized: string): LeadId {
  if (!leadId.startsWith('lid:')) return leadId
  return normalizeLeadId(phoneNormalized)
}
