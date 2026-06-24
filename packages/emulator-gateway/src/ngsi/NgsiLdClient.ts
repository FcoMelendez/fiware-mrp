import type { NgsiLdEntity } from '../types.js';

export class NgsiLdClient {
  constructor(
    private readonly orionUrl: string,
    private readonly contextUrl: string,
  ) {}

  async isReady(): Promise<boolean> {
    try {
      const res = await fetch(`${this.orionUrl}/ngsi-ld/ex/v1/version`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getEntity(id: string): Promise<NgsiLdEntity | null> {
    try {
      const res = await fetch(
        `${this.orionUrl}/ngsi-ld/v1/entities/${encodeURIComponent(id)}`,
        {
          headers: {
            Accept: 'application/ld+json',
            Link: `<${this.contextUrl}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`,
          },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!res.ok) return null;
      return (await res.json()) as NgsiLdEntity;
    } catch {
      return null;
    }
  }

  async queryEntities(types: string[]): Promise<NgsiLdEntity[]> {
    try {
      const params = new URLSearchParams({ type: types.join(',') });
      const res = await fetch(
        `${this.orionUrl}/ngsi-ld/v1/entities?${params}`,
        {
          headers: {
            Accept: 'application/ld+json',
            Link: `<${this.contextUrl}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`,
          },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!res.ok) return [];
      return (await res.json()) as NgsiLdEntity[];
    } catch {
      return [];
    }
  }

  async deleteEntitiesByType(types: string[]): Promise<number> {
    const entities = await this.queryEntities(types);
    if (entities.length === 0) return 0;
    const ids = entities.map((e) => e.id);
    try {
      const res = await fetch(`${this.orionUrl}/ngsi-ld/v1/entityOperations/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids),
        signal: AbortSignal.timeout(10000),
      });
      return res.ok ? ids.length : 0;
    } catch {
      return 0;
    }
  }

  async createSubscription(body: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(`${this.orionUrl}/ngsi-ld/v1/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ld+json',
          Link: `<${this.contextUrl}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const location = res.headers.get('Location');
      return location ? location.split('/').pop() ?? null : null;
    } catch {
      return null;
    }
  }
}
