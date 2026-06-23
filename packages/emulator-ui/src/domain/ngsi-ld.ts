export interface NgsiLdEntity {
  id: string;
  type: string;
  [attributeName: string]: unknown;
}

export interface NgsiLdProperty<T = unknown> {
  type: 'Property';
  value: T;
  observedAt?: string;
}

export interface NgsiLdRelationship {
  type: 'Relationship';
  object: string;
  observedAt?: string;
}

export function propValue<T>(entity: NgsiLdEntity, attr: string): T | undefined {
  const p = entity[attr] as NgsiLdProperty<T> | undefined;
  return p?.value;
}

export function relObject(entity: NgsiLdEntity, attr: string): string | undefined {
  const r = entity[attr] as NgsiLdRelationship | undefined;
  return r?.object;
}
