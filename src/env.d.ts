/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      name: string;
      email: string;
      role: 'facilitator' | 'participant' | 'admin';
      orgId: string;
      squadId: string | null;
      onboardingComplete: boolean;
    } | null;
    session: {
      id: string;
      expiresAt: Date;
    } | null;
  }
}
