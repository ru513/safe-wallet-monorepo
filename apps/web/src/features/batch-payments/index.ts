import { createFeatureHandle } from '@/features/__core__'
import type { BatchPaymentsContract } from './contract'

export const BatchPaymentsFeature = createFeatureHandle<BatchPaymentsContract>('batch-payments')
