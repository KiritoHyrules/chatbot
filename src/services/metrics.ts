export interface MetricsReport {
  totalTemplateCalls: number
  totalAiCalls: number
  aiFailures: number
  templateUsage: Record<string, number>
  averageAiResponseTime: number
  abandonCount: number
  funnel: FunnelMetrics
}

export interface FunnelMetrics {
  captureStarted: number
  captureStepReached: Record<string, number>
  captureCompleted: number
  abandonedAtStep: Record<string, number>
}

const state = {
  templateCalls: 0,
  templateUsage: {} as Record<string, number>,
  aiCalls: 0,
  aiFailures: 0,
  aiTotalTime: 0,
  abandonCount: 0,
  funnel: {
    captureStarted: 0,
    captureStepReached: {} as Record<string, number>,
    captureCompleted: 0,
    abandonedAtStep: {} as Record<string, number>,
  },
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

  trackFunnelStart(phone: string): void {
    state.funnel.captureStarted++
  },

  trackFunnelStep(phone: string, step: string): void {
    state.funnel.captureStepReached[step] = (state.funnel.captureStepReached[step] ?? 0) + 1
  },

  trackFunnelComplete(phone: string): void {
    state.funnel.captureCompleted++
  },

  trackFunnelAbandon(phone: string, step: string): void {
    state.funnel.abandonedAtStep[step] = (state.funnel.abandonedAtStep[step] ?? 0) + 1
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
      funnel: {
        captureStarted: state.funnel.captureStarted,
        captureStepReached: { ...state.funnel.captureStepReached },
        captureCompleted: state.funnel.captureCompleted,
        abandonedAtStep: { ...state.funnel.abandonedAtStep },
      },
    }
  },

  reset(): void {
    state.templateCalls = 0
    state.templateUsage = {}
    state.aiCalls = 0
    state.aiFailures = 0
    state.aiTotalTime = 0
    state.abandonCount = 0
    state.funnel = {
      captureStarted: 0,
      captureStepReached: {},
      captureCompleted: 0,
      abandonedAtStep: {},
    }
  },
}
