// InspectorOverlay — renders inside the right DOM panel, not a Phaser scene overlay.
// Called from EntityInspector DOM component; exported as a standalone class.

export class InspectorOverlay {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`InspectorOverlay: element #${containerId} not found`);
    this.container = el;
  }

  show(entityId: string, entity: Record<string, unknown>): void {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'inspector-header';
    header.innerHTML = `
      <span class="inspector-id">${entityId}</span>
      <span class="inspector-type badge badge-blue">${entity['type'] as string ?? ''}</span>
    `;
    this.container.appendChild(header);

    const pre = document.createElement('pre');
    pre.className = 'inspector-json';
    pre.textContent = JSON.stringify(entity, null, 2);
    this.container.appendChild(pre);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-secondary btn-sm';
    copyBtn.textContent = 'Copy JSON';
    copyBtn.onclick = () => navigator.clipboard.writeText(JSON.stringify(entity, null, 2));
    this.container.appendChild(copyBtn);
  }

  clear(): void {
    this.container.innerHTML = '<p class="inspector-empty">Click an object to inspect its NGSI-LD entity.</p>';
  }
}
