import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('createApp', () => {
  it('builds an Express app instance', () => {
    const app = createApp();
    expect(typeof app.listen).toBe('function');
  });
});
