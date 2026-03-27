import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDealerPublishParts, resolveSelfRegistrationAction } from '../src/lib/dealerOnboarding.js';

test('resolveSelfRegistrationAction handles first-time application', () => {
  assert.equal(resolveSelfRegistrationAction(null), 'create_pending');
  assert.equal(resolveSelfRegistrationAction(undefined), 'create_pending');
});

test('resolveSelfRegistrationAction allows resubmission for pending/rejected', () => {
  assert.equal(resolveSelfRegistrationAction('pending'), 'resubmit_pending');
  assert.equal(resolveSelfRegistrationAction('rejected'), 'resubmit_pending');
});

test('resolveSelfRegistrationAction blocks already approved dealer duplication', () => {
  assert.equal(resolveSelfRegistrationAction('approved'), 'already_approved');
});

test('canDealerPublishParts only allows approved onboarding status', () => {
  assert.equal(canDealerPublishParts('approved'), true);
  assert.equal(canDealerPublishParts('pending'), false);
  assert.equal(canDealerPublishParts('rejected'), false);
  assert.equal(canDealerPublishParts(undefined), false);
});

