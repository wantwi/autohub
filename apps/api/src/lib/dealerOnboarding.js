export function resolveSelfRegistrationAction(existingStatus) {
  if (!existingStatus) return 'create_pending';
  if (existingStatus === 'approved') return 'already_approved';
  return 'resubmit_pending';
}

export function canDealerPublishParts(onboardingStatus) {
  return onboardingStatus === 'approved';
}

