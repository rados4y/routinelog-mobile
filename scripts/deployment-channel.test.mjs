import { describe, expect, it } from 'vitest';
import { getDeploymentChannel } from './deployment-channel.mjs';

describe('EAS deployment destination', () => {
  it.each([
    ['push', 'main', 'production'],
    ['push', 'develop', 'development'],
    ['push', 'feat/settings', 'development'],
    ['pull_request', 'main', 'preview'],
    ['pull_request', '42/merge', 'preview'],
  ])('routes %s from %s to %s', (event, ref, expected) => {
    expect(getDeploymentChannel(event, ref)).toBe(expected);
  });

  it.each(['preview', 'development', 'production'])(
    'allows an explicit manual %s release from main',
    (channel) => {
      expect(getDeploymentChannel('workflow_dispatch', 'main', channel)).toBe(
        channel,
      );
    },
  );

  it('keeps automatic routing independent of manual input', () => {
    expect(getDeploymentChannel('pull_request', 'main', 'production')).toBe(
      'preview',
    );
    expect(getDeploymentChannel('push', 'feat/settings', 'production')).toBe(
      'development',
    );
  });

  it('rejects an invalid manual destination instead of falling back to production', () => {
    expect(() =>
      getDeploymentChannel('workflow_dispatch', 'main', 'prodution'),
    ).toThrow('Invalid EAS channel');
  });

  it('defaults manual releases to preview when input is missing', () => {
    expect(getDeploymentChannel('workflow_dispatch', 'main')).toBe('preview');
    expect(getDeploymentChannel('workflow_dispatch', 'feat/settings')).toBe(
      'preview',
    );
  });
});
