import { createFlow } from '@builderbot/bot'
import { cancelFlow } from './cancel.flow.js'
import { welcomeFlow } from './welcome.flow.js'
import { programsFlow } from './programs.flow.js'
import { faqFlow } from './faq.flow.js'
import { handoffFlow } from './handoff.flow.js'
import { leadCaptureFlow } from './lead-capture.flow.js'

export const flow = createFlow([cancelFlow, welcomeFlow, programsFlow, faqFlow, handoffFlow, leadCaptureFlow])
