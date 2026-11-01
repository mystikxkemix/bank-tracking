import { z } from 'zod';

// French validation messages everywhere (API error payloads and client-side forms).
z.config(z.locales.fr());
