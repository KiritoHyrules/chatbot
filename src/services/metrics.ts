export interface MetricsReport {
  totalTemplateCalls: number
  totalAiCalls: number
  aiFailures: number
  templateUsage: Record<string, number>
  averageAiResponseTime: number
  abandonCount: number
}

const state = {
  templateCalls: 0,
  templateUsage: {} as Record<string, number>,
  aiCalls: 0,
  aiFailures: 0,
  aiTotalTime: 0,
  abandonCount: 0,
}

export const metrics = {
  trackTemplate(scenario: string): void {
    state.templateCalls++
    state.templateUsage[scenario] = (state.templateUsage[scenario] ?? 0) + 1
  },

  trackAi(phone: string, durationMs: number, success: boolean): void {
    state.aiCalls++
    state.aiTotalTime += durationMs
    if (!success) {
      state.aiFailures++
    }
  },

  trackAbandon(phone: string): void {
    state.abandonCount++
  },

  report(): MetricsReport {
    return {
      totalTemplateCalls: state.templateCalls,
      totalAiCalls: state.aiCalls,
      aiFailures: state.aiFailures,
      templateUsage: { ...state.templateUsage },
      averageAiResponseTime: state.aiCalls > 0
        ? Math.round(state.aiTotalTime / state.aiCalls)
        : 0,
      abandonCount: state.abandonCount,
    }
  },

  reset(): void {
    state.templateCalls = 0
    state.templateUsage = {}
    state.aiCalls = 0
    state.aiFailures = 0
    state.aiTotalTime = 0
    state.abandonCount = 0
  },
}
