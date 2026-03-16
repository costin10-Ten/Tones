import { makeHandler } from '@keystatic/astro/api';
import keystaticConfig from '../../../../keystatic.config';

export const ALL = makeHandler({ config: keystaticConfig });

// This route must be server-rendered (not prerendered)
export const prerender = false;
