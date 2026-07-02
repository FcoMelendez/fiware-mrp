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
      const params = new URLSearchParams({ type: types.join(','), limit: '1000' });
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

  async deleteEntitiesByType(_types: string[]): Promise<number> {
    // Use local=true (Orion-LD extension) to list ALL locally-stored entities
    // without a type filter — avoids the "Too broad query" 400 and context-
    // expansion issues that make per-type deletes return 0 results.
    const ids: string[] = [];
    let offset = 0;
    while (true) {
      try {
        const params = new URLSearchParams({ limit: '200', offset: String(offset), local: 'true' });
        const res = await fetch(
          `${this.orionUrl}/ngsi-ld/v1/entities?${params}`,
          {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!res.ok) break;
        const page = (await res.json()) as NgsiLdEntity[];
        if (!Array.isArray(page) || page.length === 0) break;
        ids.push(...page.map((e) => e.id));
        if (page.length < 200) break;
        offset += 200;
      } catch {
        break;
      }
    }

    if (ids.length === 0) return 0;

    // Batch-delete in chunks of 200.
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      try {
        const res = await fetch(`${this.orionUrl}/ngsi-ld/v1/entityOperations/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) deleted += chunk.length;
      } catch {
        // continue with remaining chunks
      }
    }
    return deleted;
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
